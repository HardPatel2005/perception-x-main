"""
Modal Client - Wrapper to call Modal GPU processing from main app
Uses modal.Function.lookup() to call the already-deployed function directly.
"""
import os
import asyncio

_modal_available = False


def _is_modal_auth_error(error: Exception) -> bool:
    message = str(error).lower()
    return (
        "token missing" in message
        or "could not authenticate client" in message
        or "modal token" in message
        or "auth" in message and "modal" in message
    )

def get_modal_client():
    """Check if Modal is available and authenticated"""
    global _modal_available
    if _modal_available:
        return True
    try:
        import modal
        _modal_available = True
        print("✅ Modal client initialized")
        return True
    except Exception as e:
        print(f"⚠️ Failed to initialize Modal client: {e}")
        return False


async def process_video_with_modal(
    file_id: str,
    video_url: str,
    service_type: str = 'traffic-monitoring',
    progress_callback_url: str = None,
    mongo_uri: str = None,
    database_name: str = "test",
    collection_name: str = "files",
    cloudinary_cloud_name: str = None,
    cloudinary_api_key: str = None,
    cloudinary_api_secret: str = None
):
    """
    Process video using Modal GPU by looking up the deployed function directly.
    Uses modal.Function.lookup() which is the correct pattern for calling
    deployed Modal functions from an external Python service.
    """
    if not get_modal_client():
        return None

    try:
        import modal

        def call_modal_sync():
            try:
                # Look up the already-deployed function on Modal's servers
                fn = modal.Function.from_name(
                    "perceptionx-video-processor",
                    "process_video_on_gpu"
                )

                # Call Modal GPU function (silent - summary shown at end)
                result = fn.remote(
                    file_id=file_id,
                    video_url=video_url,
                    service_type=service_type,
                    progress_callback_url=progress_callback_url,
                    mongo_uri=mongo_uri,
                    database_name=database_name,
                    collection_name=collection_name,
                    cloudinary_cloud_name=cloudinary_cloud_name,
                    cloudinary_api_key=cloudinary_api_key,
                    cloudinary_api_secret=cloudinary_api_secret
                )

                return result

            except Exception as e:
                if "NotFound" in type(e).__name__ or "not found" in str(e).lower():
                    print(f"❌ Modal function NOT FOUND: {e}")
                    print("   The function is not deployed. Run: modal deploy modal_processor.py")
                elif _is_modal_auth_error(e):
                    print("❌ Modal authentication failed: token missing or invalid")
                    print("   Run: modal token new")
                    print("   Or set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET for non-interactive auth")
                raise
            except Exception as e:
                print(f"❌ Modal call error: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                raise

        # Run blocking Modal call in a thread so it doesn't block FastAPI
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(call_modal_sync),
                timeout=3600  # 1 hour max for long videos
            )
        except asyncio.TimeoutError:
            print("❌ Modal GPU processing timed out after 1 hour")
            return None

        if result and result.get("success"):
            return result
        else:
            error = result.get("error", "Unknown error") if result else "No result returned"
            print(f"❌ Modal GPU processing failed: {error}")
            return None

    except Exception as e:
        if _is_modal_auth_error(e):
            print("❌ Modal GPU processing error: token missing. Could not authenticate client.")
            print("   Run: modal token new")
            print("   Or configure MODAL_TOKEN_ID / MODAL_TOKEN_SECRET in your environment")
        print(f"❌ Modal GPU processing error: {e}")
        return None
