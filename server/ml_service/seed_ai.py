import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime

# Load environment variables from the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    print("Error: MONGO_URI not found in .env file")
    sys.exit(1)

def seed_quant_user():
    client = MongoClient(MONGO_URI)
    # Use the DB from the URI, or 'test' if not specified
    try:
        db = client.get_database()
        print(f"Connected to DB: {db.name}")
    except:
        db = client['test']
        print("URI had no DB, defaulting to 'test'")
        
    users_collection = db['users']

    # New Scientific Identity
    ai_username = "Sigma Alpha"
    old_username = "QuantModel_v1"
    
    # Check for old user to rename
    old_user = users_collection.find_one({"username": old_username})
    if old_user:
        print(f"Renaming old bot '{old_username}' to '{ai_username}'...")
        users_collection.update_one(
            {"_id": old_user['_id']},
            {"$set": {"username": ai_username}}
        )
    
    existing_user = users_collection.find_one({"username": ai_username})
    
    # Professional Bio (Refined)
    bio = (
        "Advanced Machine Learning Agent specializing in Earnings Volatility and Sector Sympathy. "
        "Continuously trained on real-time market outcomes to refine predictive accuracy. "
        "Leveraging XGBoost ensembles and Nasdaq-100 macro-correlation logic."
    )
    
    # Update fields if exists
    if existing_user:
        print(f"Quant User '{ai_username}' already exists. ID: {existing_user['_id']}")
        users_collection.update_one(
            {"_id": existing_user['_id']}, 
            {"$set": {
                "isBot": True, 
                "about": bio,
                "avatar": "https://api.dicebear.com/9.x/shapes/svg?seed=SigmaAlpha",
                "aiMetrics": {
                    "specialization": "Tech Sector Earnings & Volatility",
                    "trainingAccuracy": 0.0, # Will be updated by model
                    "lastRetrained": datetime.datetime.now()
                }
            }}
        )
        print("Updated existing user profile.")
        return existing_user['_id']
    
    new_user = {
        "googleId": "sigma_alpha_v1_id_placeholder",
        "username": ai_username,
        "email": "sigma@stockpredictor.ai",
        "avatar": "https://api.dicebear.com/9.x/shapes/svg?seed=SigmaAlpha",
        "about": bio,
        "isAdmin": False,
        "isVerified": True,
        "isBot": True,
        "aiMetrics": {
            "specialization": "Tech Sector Earnings & Volatility",
            "trainingAccuracy": 0.0,
            "lastRetrained": datetime.datetime.now()
        },
        "totalRating": 0,
        "analystRating": {
             "total": 0, "fromPredictions": 0, "fromBadges": 0, "fromShares": 0, 
             "fromReferrals": 0, "fromRanks": 0, "fromBonus": 0,
             "shareBreakdown": {}, "predictionBreakdownByStock": {}, 
             "badgeBreakdown": {}, "rankBreakdown": {}
        },
        "avgRating": 0,
        "language": "en",
        "notificationSettings": {
            "allFollowedPredictions": False, "trustedShortTerm": False, "trustedLongTerm": False,
            "newPrediction": False, "newFollower": False, "badgeEarned": False,
            "goldenPost": False, "priceChange": False, "predictionAssessed": False, "newReferral": False
        },
        "followers": [],
        "following": [],
        "badges": [],
        "createdAt": datetime.datetime.now(),
        "updatedAt": datetime.datetime.now()
    }
    
    result = users_collection.insert_one(new_user)
    print(f"Created new Quant User '{ai_username}'. ID: {result.inserted_id}")
    return result.inserted_id

if __name__ == "__main__":
    seed_quant_user()
