#!/bin/bash

source venv/bin/activate
python analyze.py "$1"
echo "The analysis exited with status $?. Press Enter to close the terminal."
read -r _
