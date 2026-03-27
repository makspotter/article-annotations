module.exports = {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  plugins: [require('prettier-plugin-organize-attributes')],
  singleAttributePerLine: true,
  // Custom attribute order for Angular templates:
  // 1) id
  // 2) class
  // 3) template refs (#ref)
  // 4) standard/other (incl. structural directives and unmapped)
  // 5) bindings (two-way, animation inputs, inputs)
  // 6) outputs (always last)
  attributeGroups: [
    '$ID',
    '$CLASS',
    '$ANGULAR_ELEMENT_REF',
    '$ANGULAR_STRUCTURAL_DIRECTIVE',
    '$DEFAULT',
    '$ANGULAR_TWO_WAY_BINDING',
    '$ANGULAR_ANIMATION_INPUT',
    '$ANGULAR_INPUT',
    '$ANGULAR_OUTPUT',
  ],
};
