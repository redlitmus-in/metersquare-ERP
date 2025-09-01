#!/bin/bash
# Shell script to run Python commands with the correct path

PYTHON_PATH="/c/Users/meganathan.s/AppData/Local/Programs/Python/Python312/python.exe"

if [ "$#" -eq 0 ]; then
    echo "Starting Python interactive shell..."
    $PYTHON_PATH
else
    echo "Running: python $@"
    $PYTHON_PATH "$@"
fi