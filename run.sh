#!/bin/bash

if [ -d "venv" ]; then
    echo "Virtual environment found."
    source venv/bin/activate
else
    # create a virtual environment
    echo "Installing a virtual environment."
    python3.10 -m venv venv
    source venv/bin/activate

    # download and install dependencies
    pip install -r requirements.txt
fi
