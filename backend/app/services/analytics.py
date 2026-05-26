import logging
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import RequestLog, Document as DBDocument

logger = logging.getLogger("nexusai.analytics")

class AnalyticsService:
    def get_dashboard_metrics(self, db: Session) -> dict:
        """Computes aggregated LLMOps indicators for dashboard analytics cards."""
        try:
            total_requests = db.query(func.count(RequestLog.id)).scalar() or 0
            
            if total_requests == 0:
                return {
                    "total_requests": 0,
                    "avg_latency_ms": 0,
                    "cache_hit_rate": 0.0,
                    "fallback_rate": 0.0,
                    "total_tokens_estimated": 0,
                    "document_count": db.query(func.count(DBDocument.id)).scalar() or 0,
                    "model_distribution": {},
                    "intent_distribution": {},
                    "timeline_data": [],
                    "model_performance": []
                }
            
            # Key statistics
            avg_latency = db.query(func.avg(RequestLog.latency_ms)).scalar() or 0
            cache_hits = db.query(func.count(RequestLog.id)).filter(RequestLog.cache_hit == True).scalar() or 0
            fallbacks = db.query(func.count(RequestLog.id)).filter(RequestLog.fallback_used == True).scalar() or 0
            total_tokens = db.query(func.sum(RequestLog.tokens_estimate)).scalar() or 0
            doc_count = db.query(func.count(DBDocument.id)).scalar() or 0
            
            # Model distribution
            model_counts = db.query(
                RequestLog.model_used, func.count(RequestLog.id)
            ).group_by(RequestLog.model_used).all()
            model_dist = {model: count for model, count in model_counts}
            
            # Intent distribution
            intent_counts = db.query(
                RequestLog.intent, func.count(RequestLog.id)
            ).group_by(RequestLog.intent).all()
            intent_dist = {intent: count for intent, count in intent_counts}
            
            # Latency by model
            model_perf_query = db.query(
                RequestLog.model_used,
                func.avg(RequestLog.latency_ms),
                func.count(RequestLog.id)
            ).group_by(RequestLog.model_used).all()
            
            model_performance = [
                {
                    "model": row[0],
                    "avg_latency_ms": round(float(row[1]), 2) if row[1] else 0,
                    "request_count": row[2]
                }
                for row in model_perf_query
            ]
            
            # Timeline data (daily request volume and latency trends for the past 7 days)
            timeline_data = []
            today = datetime.utcnow().date()
            for i in range(6, -1, -1):
                day = today - timedelta(days=i)
                day_start = datetime.combine(day, datetime.min.time())
                day_end = datetime.combine(day, datetime.max.time())
                
                day_requests = db.query(func.count(RequestLog.id)).filter(
                    RequestLog.timestamp >= day_start,
                    RequestLog.timestamp <= day_end
                ).scalar() or 0
                
                day_latency = db.query(func.avg(RequestLog.latency_ms)).filter(
                    RequestLog.timestamp >= day_start,
                    RequestLog.timestamp <= day_end
                ).scalar() or 0
                
                day_cache_hits = db.query(func.count(RequestLog.id)).filter(
                    RequestLog.timestamp >= day_start,
                    RequestLog.timestamp <= day_end,
                    RequestLog.cache_hit == True
                ).scalar() or 0
                
                timeline_data.append({
                    "date": day.strftime("%b %d"),
                    "requests": day_requests,
                    "avg_latency_ms": round(float(day_latency), 2) if day_latency else 0,
                    "cache_hits": day_cache_hits
                })

            return {
                "total_requests": total_requests,
                "avg_latency_ms": round(float(avg_latency), 2),
                "cache_hit_rate": round(cache_hits / total_requests, 4),
                "fallback_rate": round(fallbacks / total_requests, 4),
                "total_tokens_estimated": total_tokens,
                "document_count": doc_count,
                "model_distribution": model_dist,
                "intent_distribution": intent_dist,
                "timeline_data": timeline_data,
                "model_performance": model_performance
            }
        except Exception as e:
            logger.error(f"Error computing analytics metrics: {str(e)}")
            return {}

    def get_recent_logs(self, db: Session, limit: int = 50) -> list[dict]:
        """Fetches the latest execution logs for audit tracing tables."""
        try:
            logs = db.query(RequestLog).order_by(RequestLog.timestamp.desc()).limit(limit).all()
            return [
                {
                    "id": log.id,
                    "prompt": log.prompt,
                    "response_preview": log.response_preview,
                    "intent": log.intent,
                    "model_used": log.model_used,
                    "latency_ms": log.latency_ms,
                    "tokens_estimate": log.tokens_estimate,
                    "cache_hit": log.cache_hit,
                    "fallback_used": log.fallback_used,
                    "timestamp": log.timestamp.isoformat()
                }
                for log in logs
            ]
        except Exception as e:
            logger.error(f"Error fetching request logs: {str(e)}")
            return []

# Singleton analytics service instance
analytics = AnalyticsService()
