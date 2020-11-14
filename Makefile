jsdoc := ./node_modules/.bin/jsdoc
terser := ./node_modules/.bin/terser
sources := $(wildcard lib/*.js)
output := $(patsubst lib/%,docs/%,$(sources))
minified := $(patsubst lib/%,docs/min/%,$(sources))

.PHONY: jsdocs clean

jsdocs: docs $(output) $(minified)
	$(jsdoc) -r -c jsdoc.json lib

clean:
	rm -rf docs

docs:
	mkdir -p docs/min

$(output): preamble.txt
$(minified): preamble.txt

docs/%.js: lib/%.js
	cat preamble.txt $< > $@

docs/min/%.js: lib/%.js
	cat preamble.txt > $@ && $(terser) $< -m >> $@
