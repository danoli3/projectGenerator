#!/bin/bash
set -e


# Script for CI / BOTS 

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_DIR="$( cd "$( dirname "${CURRENT_DIR}"/../../ )" && pwd )"
PG_DIR="$( cd "$( dirname "${SCRIPT_DIR}/../../" )" && pwd )"

OF_DIR="$( cd "$( dirname "${PG_DIR}/../../../" )" && pwd )"

FRONTEND_DIR="$( cd "$( dirname "${PG_DIR}/frontend" )" && pwd )"

CMDLINE_DIR="$( cd "$( dirname "${PG_DIR}/commandLine" )" && pwd )"


echo "CURRENT_DIR:  ${CURRENT_DIR}"
echo "SCRIPT_DIR:  ${SCRIPT_DIR}"
echo "PG_DIR:  ${PG_DIR}"
echo "FRONTEND_DIR:  ${FRONTEND_DIR}"
echo "CMD_DIR:  ${CMD_DIR}"
echo "====== OF_DIR: ${OF_DIR}"


cd ../../
of_root=${PWD}/openFrameworks
pg_root=${PWD}/openFrameworks/apps/projectGenerator
pwd
echo "ci setup - ${PWD}"
ls
if [ -d "${of_root}/.git" ]; then
	echo 'OF already cloned, using it'
	cd ${of_root}
	git pull
	# git submodule init
	# git submodule update
	# git submodule update
	cd ..
	# Control will enter here if $DIRECTORY exists.
else
	echo "cloning of"
	git clone --depth=1 https://github.com/openframeworks/openFrameworks
	pwd 
	ls
fi
	
cd ${of_root}
if [ -d "libs/glfw" ]; then
	echo 'libs installed, using them'
else
	echo 'downloading libs'
	scripts/osx/download_libs.sh
fi

echo "ci install complete"
ls
pwd
cd ../

echo "copying pg to oF dir"
pwd
cp -rv projectGenerator/projectGenerator/* openFrameworks/apps/
