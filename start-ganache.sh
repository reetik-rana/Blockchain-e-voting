#!/bin/bash
# Start Ganache with a fixed mnemonic so accounts remain the same
# This ensures the admin account doesn't change between restarts

npx ganache --port 7545 --chain.chainId 1337 --mnemonic "super lonely focus index urban result bounce photo normal film panther day"
