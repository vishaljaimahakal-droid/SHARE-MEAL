import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Integer, DateTime, Text, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, sessionmaker

# Local development uses SQLite by default. Set DATABASE_URL in hosting to use PostgreSQL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sharemeal.db")
# Supabase provides a postgresql:// URL; psycopg 3 is the driver installed by requirements.txt.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

if DATABASE_URL.startswith("sqlite:"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    food_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), default="servings")
    donor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    pickup_location: Mapped[str] = mapped_column(String(250), nullable=False)
    expiry_time: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Available", index=True)
    claimed_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ShareMeal API",
    description="MVP API for coordinating surplus food donations.",
    version="1.0.0"
)

# Keep local Vite origins working, and append the deployed frontend origin via CORS_ORIGINS.
extra_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in extra_origins.split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DonationCreate(BaseModel):
    food_name: str = Field(min_length=2, max_length=120)
    quantity: int = Field(gt=0, le=100000)
    unit: str = Field(default="servings", min_length=1, max_length=30)
    donor_name: str = Field(min_length=2, max_length=120)
    pickup_location: str = Field(min_length=3, max_length=250)
    expiry_time: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=1000)


class ClaimRequest(BaseModel):
    claimed_by: str = Field(min_length=2, max_length=120)


def donation_dict(d: Donation):
    return {
        "id": d.id,
        "food_name": d.food_name,
        "quantity": d.quantity,
        "unit": d.unit,
        "donor_name": d.donor_name,
        "pickup_location": d.pickup_location,
        "expiry_time": d.expiry_time,
        "notes": d.notes,
        "status": d.status,
        "claimed_by": d.claimed_by,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@app.get("/")
def home():
    return {"message": "ShareMeal API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/donations")
def list_donations(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
):
    stmt = select(Donation).order_by(Donation.id.desc())
    if status and status != "All":
        stmt = stmt.where(Donation.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            (Donation.food_name.ilike(term)) |
            (Donation.pickup_location.ilike(term)) |
            (Donation.donor_name.ilike(term))
        )
    return [donation_dict(d) for d in db.scalars(stmt).all()]


@app.post("/donations", status_code=201)
def create_donation(payload: DonationCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    for key in ("food_name", "unit", "donor_name", "pickup_location"):
        data[key] = data[key].strip()
    donation = Donation(**data, status="Available")
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation_dict(donation)


@app.patch("/donations/{donation_id}/claim")
def claim_donation(
    donation_id: int,
    payload: ClaimRequest,
    db: Session = Depends(get_db),
):
    donation = db.get(Donation, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "Available":
        raise HTTPException(status_code=409, detail="Donation is no longer available")
    donation.status = "Claimed"
    donation.claimed_by = payload.claimed_by.strip()
    db.commit()
    db.refresh(donation)
    return donation_dict(donation)


@app.patch("/donations/{donation_id}/collect")
def collect_donation(donation_id: int, db: Session = Depends(get_db)):
    donation = db.get(Donation, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != "Claimed":
        raise HTTPException(status_code=409, detail="Only claimed donations can be marked collected")
    donation.status = "Collected"
    db.commit()
    db.refresh(donation)
    return donation_dict(donation)


@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    donations = db.scalars(select(Donation)).all()
    return {
        "total": len(donations),
        "available": sum(d.status == "Available" for d in donations),
        "claimed": sum(d.status == "Claimed" for d in donations),
        "collected": sum(d.status == "Collected" for d in donations),
        "servings_listed": sum(d.quantity for d in donations),
    }
