.PHONY: install install-immutable

install:
	yarn install

# CI installation with lockfile validation
install-immutable:
	yarn install --immutable
