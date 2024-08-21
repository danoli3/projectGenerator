#!/usr/bin/env bash

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_DIR="$( cd "$( dirname "${CURRENT_DIR}"/../../ )" && pwd )"
PG_DIR="$( cd "$( dirname "${SCRIPT_DIR}"/../../ )" && pwd )"

CMD_DIR="${PG_DIR}/commandLine"
EXE_FILE="commandLine.exe"  # Update this variable with the name of your executable

echo "CURRENT_DIR:  ${CURRENT_DIR}"
echo "SCRIPT_DIR:  ${SCRIPT_DIR}"
echo "PG_DIR:  ${PG_DIR}"
echo "CMD_DIR:  ${CMD_DIR}"
echo "Executable File: ${EXE_FILE}"
echo "====== ${CMD_DIR}"

# Compile commandline tool

cd "${CMD_DIR}/bin"
pwd
ls
echo "Testing projectGenerator: [vs]"

chmod +x "${EXE_FILE}"

# Run the project generator executable
./"${EXE_FILE}" --recursive -pvs -b -o../../../../ ../../../../examples/
errorcode=$?
if [[ $errorcode -ne 0 ]]; then
    exit $errorcode
fi

echo "Test out of folder -o [vs]"
rm -rf ../../../../../pg2
mkdir -p ../../../../../pg2

if ! command -v rsync &> /dev/null
then      
    cp -a ./"${EXE_FILE}" ../../../../../pg2 
else
    rsync -azp ./"${EXE_FILE}" ../../../../../pg2
fi

cd ../../../../../pg2
ls -a
pwd

# Run the project generator executable again in the new directory
./"${EXE_FILE}" --recursive -pvs -b -o"./../openFrameworks" ./../openFrameworks/examples/
errorcode=$?
if [[ $errorcode -ne 0 ]]; then
    exit $errorcode
fi

echo "Test generate new just name"
./"${EXE_FILE}" -o"../openFrameworks" -p"vs" "testingGenerate"
errorcode=$?
if [[ $errorcode -ne 0 ]]; then
    exit $errorcode
fi

echo "Test generate new / update full path"
./"${EXE_FILE}" -o"../openFrameworks" -p"vs" "../openFrameworks/apps/myApps/testingGenerate"
errorcode=$?
if [[ $errorcode -ne 0 ]]; then
    exit $errorcode
fi

echo "Test generate full path"
./"${EXE_FILE}" -o"../openFrameworks" -p"vs" "../openFrameworks/apps/myApps/testingGenerate2"
errorcode=$?
if [[ $errorcode -ne 0 ]]; then
    exit $errorcode
fi

echo "Successful projectGenerator tests for [vs]"
