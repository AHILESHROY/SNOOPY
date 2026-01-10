#v3
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, MetaData, Table, text
from sqlalchemy.exc import SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from pydantic import BaseModel


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Aadhav123!"
DB_HOST = "snoopy-primary.c5ema6oo0wwy.ap-south-1.rds.amazonaws.com"
DB_PORT = "5432"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
metadata = MetaData()
metadata.reflect(bind=engine)

@app.get("/prices")
def get_prices():
    query = "SELECT * FROM prices ORDER BY u_id, record_date"
    try:
        with engine.connect() as conn:
            sql_query = text(query)
            result = conn.execute(sql_query)

            # Use a dict to collect arrays by u_id
            grouped_data = defaultdict(lambda: {
                "u_id": "",
                "record_date": [],
                "price": [],
                "original_price": [],
                "discount_rate": [],
                "ratings": [],
                "number_of_ratings": []
            })

            for row in result:
                uid = row._mapping["u_id"]
                data = grouped_data[uid]
                data["u_id"] = uid
                data["record_date"].append(row._mapping["record_date"])
                data["price"].append(row._mapping["price"])
                data["original_price"].append(row._mapping["original_price"])
                data["discount_rate"].append(row._mapping["discount_rate"])
                data["ratings"].append(row._mapping["ratings"])
                data["number_of_ratings"].append(row._mapping["number_of_ratings"])

            return {"data": list(grouped_data.values())}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products")
def get_products():
    query = "SELECT * FROM products"
    try:
        with engine.connect() as conn:
            sql_query = text(query)
            result = conn.execute(sql_query)
            rows = [dict(row._mapping) for row in result]
            return {"data": rows}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products_complete")
def get_products_join():
    query = '''
        SELECT 
            p.u_id,
            p.product_name,
            p.platform,
            p.link,
            p.image_url,
            pr.price,
            pr.original_price,
                pr.discount_rate,
            pr.ratings,
            pr.number_of_ratings
        FROM products p
        JOIN (
            SELECT DISTINCT ON (u_id) *
            FROM prices
            ORDER BY u_id, record_date DESC
        ) pr ON pr.u_id = p.u_id;
    '''
    try:
        with engine.connect() as conn:
            sql_query = text(query)
            result = conn.execute(sql_query)
            rows = [dict(row._mapping) for row in result]
            return {"data": rows}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

class WishlistDelete(BaseModel):
    email: str
    u_id: str
    
@app.post("/remove_from_list")
def remove_from_wishlist(data: WishlistDelete):
    query = text("DELETE FROM budgets WHERE user_email = :email AND u_id = :u_id")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"email": data.email, "u_id": data.u_id})
            conn.commit()
            return {"message": "Deleted successfully", "rows_affected": result.rowcount}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WishlistAdd(BaseModel):
    email: str
    u_id: str
    price: float

@app.post("/add_to_list")
def add_to_wishlist(data: WishlistAdd):
    query = text("""
        INSERT INTO budgets (user_email, u_id, value)
        VALUES (:email, :u_id, :price)
        ON CONFLICT (user_email, u_id)
        DO UPDATE SET value = EXCLUDED.value
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"email": data.email, "u_id": data.u_id, "price": data.price})
            conn.commit()
            return {"message": "Product added or updated successfully", "rows_affected": result.rowcount}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UserEmail(BaseModel):
    email: str

@app.post("/get_tracked_objects")
def get_tracked_objects(data: UserEmail):
    query = text("""
            SELECT u_id, value AS product_price FROM budgets WHERE user_email = :email
        """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"email": data.email})

            user_budgets = {
                "u_id": [],
                "product_price": []
            }

            for row in result:
                user_budgets["u_id"].append(row[0])
                user_budgets["product_price"].append(row[1])

            return {"user_budgets": [user_budgets]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TrackerAdd(BaseModel):
    link: str
    platform: str

@app.post("/add_to_tracker")
def add_to_tracker(data: TrackerAdd):
    try:
        query = text("""
            SELECT MAX(CAST(SUBSTRING(u_id FROM '[0-9]+$') AS INTEGER)) AS max_uid
            FROM (
                SELECT u_id FROM products
                UNION ALL
                SELECT u_id FROM update_buffer
            ) AS combined
            WHERE u_id LIKE 'sn%';
        """)
        with engine.connect() as conn:
            result = conn.execute(query).scalar()
            max_uid = result if result else 0
            next_uid = f"sn{max_uid + 1:03d}"

            insert_query = text("""
                INSERT INTO update_buffer (u_id, link, platform)
                VALUES (:u_id, :link, :platform)
            """)
            conn.execute(insert_query, {
                "u_id": next_uid,
                "link": data.link,
                "platform": data.platform
            })
            conn.commit()

        return {"message": "Product added to update buffer", "u_id": next_uid}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
