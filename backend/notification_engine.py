"""
GhostWhale AI — Notification Engine

SSE (Server-Sent Events) event queue that pushes:
  - Raw whale detections
  - Council debate thoughts and votes
  - Trade executions
  - Liquidity movements
to the React dashboard in real-time.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

# List of active client queues
_LISTENERS: list[asyncio.Queue] = []

def broadcast_event(event_type: str, data: dict) -> None:
    """
    Pushes an event payload to all connected SSE clients.
    """
    payload = {
        "event": event_type,
        "data": data
    }
    logger.debug("Broadcasting event %s to %d clients", event_type, len(_LISTENERS))
    
    # Run through listeners and insert into queues (non-blocking)
    for q in _LISTENERS:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            try:
                q.get_nowait() # drop oldest
                q.put_nowait(payload)
            except Exception:
                pass

async def event_stream() -> AsyncGenerator[str, None]:
    """
    FastAPI dependency yielding formatting server-sent event strings.
    """
    q = asyncio.Queue(maxsize=100)
    _LISTENERS.append(q)
    logger.info("New dashboard SSE client connected. Total listeners: %d", len(_LISTENERS))
    
    try:
        while True:
            try:
                # Wake up and fetch next event
                event = await q.get()
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
            except asyncio.CancelledError:
                break
    finally:
        _LISTENERS.remove(q)
        logger.info("Dashboard SSE client disconnected. Total listeners: %d", len(_LISTENERS))
