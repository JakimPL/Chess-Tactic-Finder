#!/bin/bash

source venv/bin/activate
python "$1" "$2"
echo "The analysis exited with status $?. Press Enter to close the terminal."
read -r _
