from modules.application.app import LOG_LEVEL, PORT, app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level=LOG_LEVEL)
