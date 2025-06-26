.PHONY: build test deploy clean lint format help

# Default target
help:
	@echo "Pool Odds Smart Contract Build System"
	@echo ""
	@echo "Available commands:"
	@echo "  build          - Build the program"
	@echo "  test           - Run all tests"
	@echo "  deploy-local   - Deploy to local validator"
	@echo "  deploy-devnet  - Deploy to devnet"
	@echo "  deploy-mainnet - Deploy to mainnet"
	@echo "  clean          - Clean build artifacts"
	@echo "  lint           - Run linter"
	@echo "  format         - Format code"
	@echo "  audit          - Run security audit"
	@echo "  size           - Check program size"
	@echo "  logs           - Watch program logs"
	@echo "  info           - Show program info"

# Build the program
build:
	@echo "Building Pool Odds program..."
	anchor build

# Run tests
test:
	@echo "Running tests..."
	anchor test --skip-deploy

# Run tests with deployment
test-deploy:
	@echo "Running tests with deployment..."
	anchor test

# Deploy to local validator
deploy-local:
	@echo "Deploying to local validator..."
	anchor deploy --provider.cluster localnet

# Deploy to devnet
deploy-devnet:
	@echo "Deploying to devnet..."
	anchor deploy --provider.cluster devnet

# Deploy to mainnet (with confirmation)
deploy-mainnet:
	@echo "⚠️  WARNING: Deploying to MAINNET!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	anchor deploy --provider.cluster mainnet

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	anchor clean
	rm -rf target/
	rm -rf .anchor/

# Run linter
lint:
	@echo "Running linter..."
	cargo clippy --all-targets --all-features -- -D warnings

# Format code
format:
	@echo "Formatting code..."
	cargo fmt --all

# Run security audit
audit:
	@echo "Running security audit..."
	cargo audit
	cargo clippy -- -W clippy::all -W clippy::pedantic

# Check program size
size:
	@echo "Checking program size..."
	@if [ -f "target/deploy/pool_odds.so" ]; then \
		ls -lh target/deploy/pool_odds.so; \
		echo "Program size: $$(stat -f%z target/deploy/pool_odds.so 2>/dev/null || stat -c%s target/deploy/pool_odds.so) bytes"; \
	else \
		echo "Program not built. Run 'make build' first."; \
	fi

# Watch program logs
logs:
	@echo "Watching program logs..."
	solana logs $(shell solana-keygen pubkey target/deploy/pool_odds-keypair.json)

# Show program info
info:
	@echo "Program Information:"
	@echo "Program ID: $(shell solana-keygen pubkey target/deploy/pool_odds-keypair.json)"
	@echo "Network: $(shell solana config get | grep 'RPC URL' | awk '{print $$3}')"
	@echo "Wallet: $(shell solana config get | grep 'Keypair Path' | awk '{print $$3}')"

# Initialize a new Anchor project (for reference)
init:
	@echo "Initializing new Anchor project..."
	anchor init pool-odds --template multiple

# Verify program deployment
verify:
	@echo "Verifying program deployment..."
	anchor verify $(shell solana-keygen pubkey target/deploy/pool_odds-keypair.json)

# Generate IDL
idl:
	@echo "Generating IDL..."
	anchor idl init $(shell solana-keygen pubkey target/deploy/pool_odds-keypair.json) -f target/idl/pool_odds.json

# Update IDL
idl-update:
	@echo "Updating IDL..."
	anchor idl upgrade $(shell solana-keygen pubkey target/deploy/pool_odds-keypair.json) -f target/idl/pool_odds.json

# Setup development environment
setup:
	@echo "Setting up development environment..."
	@echo "Installing Rust..."
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
	@echo "Installing Solana CLI..."
	sh -c "$$(curl -sSfL https://release.solana.com/v1.16.0/install)"
	@echo "Installing Anchor..."
	cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
	avm install latest
	avm use latest
	@echo "Setup complete!"

# Create keypairs for deployment
keypairs:
	@echo "Creating keypairs..."
	mkdir -p keys
	solana-keygen new --outfile keys/program-keypair.json --no-bip39-passphrase
	solana-keygen new --outfile keys/authority-keypair.json --no-bip39-passphrase
	@echo "Keypairs created in keys/ directory"

# Fund accounts for testing
fund:
	@echo "Funding accounts for testing..."
	solana airdrop 10 --url devnet
	@if [ -f "keys/authority-keypair.json" ]; then \
		solana airdrop 5 keys/authority-keypair.json --url devnet; \
	fi

# Run integration tests
test-integration:
	@echo "Running integration tests..."
	cd tests && npm test

# Generate documentation
docs:
	@echo "Generating documentation..."
	cargo doc --no-deps --open

# Check dependencies
deps:
	@echo "Checking dependencies..."
	cargo tree
	anchor --version
	solana --version

# Benchmark performance
benchmark:
	@echo "Running benchmarks..."
	cargo bench

# Profile program
profile:
	@echo "Profiling program..."
	cargo build --release
	perf record --call-graph=dwarf target/release/pool_odds
	perf report

# Security check
security:
	@echo "Running security checks..."
	cargo audit
	cargo clippy -- -W clippy::all
	@echo "Checking for common vulnerabilities..."
	grep -r "unwrap()" programs/ || echo "No unwrap() calls found"
	grep -r "expect(" programs/ || echo "No expect() calls found"

# Generate test coverage
coverage:
	@echo "Generating test coverage..."
	cargo tarpaulin --out Html --output-dir coverage

# All checks before deployment
pre-deploy: clean build lint test audit size
	@echo "All pre-deployment checks passed!"

# Quick development cycle
dev: format build test
	@echo "Development cycle complete!"

# Production deployment checklist
prod-checklist:
	@echo "Production Deployment Checklist:"
	@echo "□ Code reviewed and approved"
	@echo "□ All tests passing"
	@echo "□ Security audit completed"
	@echo "□ Program size optimized"
	@echo "□ Mainnet keypairs secured"
	@echo "□ Deployment plan documented"
	@echo "□ Rollback plan prepared"
	@echo "□ Monitoring setup ready"
