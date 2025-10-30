# Ganache Test Accounts (Fixed)

When you run `./start-ganache.sh`, these accounts will ALWAYS be the same:

## Admin/Owner Account (Account 0)
- **Address**: `0x491c79f547f83C401B234DfF8E9375E91584717d`
- **Private Key**: `0xb9469ea5ec1c3e4fefe84b6c2dcb0d9bf8fff4a1dc866fa262701e7870e870fe`
- **Balance**: 1000 ETH

## Test Voter Accounts

### Account 1
- **Address**: `0xBA0b09eda4c6bCd4Bed9967702CCA1f4F1aC35f5`
- **Private Key**: `0x52e7c20d90d80b6eb0c6112d15b0ea6095f302f07a40432c18a234502f77ed2d`
- **Balance**: 1000 ETH

### Account 2
- **Address**: `0xA9643f21052B3d1b0448F3671b82398E16fB1b17`
- **Private Key**: `0x1550d53fdab5cce5cd423bd79b60ea9954bacdf9d4fc0abf3a2cd158b1d2d459`
- **Balance**: 1000 ETH

### Account 3
- **Address**: `0x60EE7E108c13C9129e01C69c9dD9DB6d0e6a8094`
- **Private Key**: `0xdf7c6414a4f4f4ec74a7653502dc230316cb68ea8a3014490c88fbc9459e8072`
- **Balance**: 1000 ETH

### Account 4-9
(Additional 6 accounts available with 1000 ETH each)

---

## How to Use

1. **Start Ganache with fixed accounts:**
   ```bash
   ./start-ganache.sh
   ```

2. **Import Admin Account to MetaMask:**
   - Open MetaMask
   - Click account icon → Import Account
   - Paste private key: `0xb9469ea5ec1c3e4fefe84b6c2dcb0d9bf8fff4a1dc866fa262701e7870e870fe`
   
3. **Import Test Voter Accounts:**
   - Use any of the accounts 1-9 for testing voter functionality

---

## Important Notes

⚠️ **NEVER use these accounts on mainnet or with real ETH!** These are test accounts only.

✅ These accounts will remain the same as long as you use `./start-ganache.sh` with the fixed mnemonic.

🔄 If you start Ganache without the mnemonic (just `npx ganache`), the accounts will be random again.
