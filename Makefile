.PHONY: all install check build clean

NODE_MODULES=node_modules/.package-lock.json

all: install check build

install: $(NODE_MODULES)

$(NODE_MODULES): package.json
	pnpm install
	@touch $@

check: install
	@echo "Running Biome check (format + lint)..."
	pnpm biome check --write .
	@echo "Check complete!"

format: install
	@echo "Running Biome format..."
	pnpm biome format --write .

lint: install
	@echo "Running Biome lint..."
	pnpm biome lint --write .

build: install
	@echo "Building wifuframe..."
	mkdir -p dist
	cp src/wifuframe.js dist/wifuframe.js
	cp src/wifuframe.css dist/wifuframe.css
	@echo "Build complete! Output in dist/"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/
	@echo "Clean complete!"

distclean: clean
	@echo "Full clean including lock files..."
	rm -f pnpm-lock.yaml
	rm -f package-lock.json
	rm -f yarn.lock

help:
	@echo "Available targets:"
	@echo "  install  - Install dependencies"
	@echo "  check    - Run format and lint (biome check --write)"
	@echo "  format   - Run code formatting only"
	@echo "  lint     - Run linting only"
	@echo "  build    - Build the library (copies to dist/)"
	@echo "  clean    - Remove dist/ and node_modules/"
	@echo "  distclean- Full clean including lock files"
	@echo "  all      - Run install, check, and build"