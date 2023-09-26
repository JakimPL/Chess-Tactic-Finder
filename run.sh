#!/bin/bash

if [ -d "venv" ]; then
    echo "Virtual environment found."
    source venv/bin/activate
    python run.py
else
    source shell/sh/install.sh
    python run.py
fi
