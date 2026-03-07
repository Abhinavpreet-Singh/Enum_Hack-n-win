#!/bin/bash

LANGUAGE=$1
FILE=$2

if [ "$LANGUAGE" = "python" ]; then
    timeout 5s python3 $FILE

elif [ "$LANGUAGE" = "cpp" ]; then
    g++ $FILE -o output && timeout 5s ./output

elif [ "$LANGUAGE" = "c" ]; then
    gcc $FILE -o output && timeout 5s ./output

elif [ "$LANGUAGE" = "java" ]; then
    javac $FILE && timeout 5s java ${FILE%.java}

elif [ "$LANGUAGE" = "node" ]; then
    timeout 5s node $FILE

else
    echo "Unsupported language"
fi
