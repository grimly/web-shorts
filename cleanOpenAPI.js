function noop() {}

/**
 * @param {Set<string>} seen
 */
function visitOpenApi(openapi, seen) {
  function dereference($ref) {
    return $ref.split(/\//).reduce(
      (o,k) => o[k],
      {'#': openapi}
    )
  }

  function dereferenced(f) {
    return function applyOn(object) {
      const {$ref} = object;
      if (typeof $ref === "string") {
        if (! seen.has($ref)) {
          seen.add($ref)
          applyOn(dereference($ref))
        }
      } else {
        f(object)
      }
    }
  }

  function values(o) {
    if (Array.isArray(o)) {
      return o;
    } else {
      return Object.values(o || {});
    }
  }

  function isDefined(o) {
    return o !== undefined;
  }

  const visitSchema = dereferenced(({
    discriminator,
    allOf,
    anyOf,
    oneOf,
    not,
    if: _if,
    then,
    else: _else,
    dependentSchemas,
    prefixItems,
    items,
    contains,
    properties,
    patternProperties,
    additionalProperties,
    propertyNames,
    unevaluatedItems,
    unevaluatedProperties,
  }) => {
    if (discriminator) {
      values(discriminator.mapping).map(dereference).forEach(visitSchema)
    }
    [
      allOf,
      anyOf,
      oneOf,
      dependentSchemas,
      prefixItems,
      properties,
      patternProperties,
    ]
    .flatMap(values)
    .concat(
      not,
      _if,
      then,
      _else,
      items,
      contains,
      additionalProperties,
      propertyNames,
      unevaluatedItems,
      unevaluatedProperties
    )
    .filter(isDefined)
    .forEach(visitSchema)
  })

  const visitCallback = dereferenced(noop);
  const visitLink = dereferenced(noop);
  const visitExample = dereferenced(noop);

  const visitResponse = dereferenced(({headers, content, links}) => {
    values(headers).forEach(visitParameter);
    values(content).forEach(visitMediaType);
    values(links).forEach(visitLink);
  });

  const visitRequestBody = dereferenced(({content}) => Object.values(content || {}).forEach(visitMediaType));

  const visitParameter = dereferenced(({schema, examples}) => {
    if (schema !== undefined) visitSchema(schema);
    values(examples).forEach(visitExample);
  });

  const visitMediaType = visitParameter; // MediaType does the same checks as parameters

  const visitOperation = dereferenced(({parameters, requestBody, responses, callbacks}) => {
    values(parameters).forEach(visitParameter);
    if (requestBody !== undefined) visitRequestBody(requestBody);
    values(responses).forEach(visitResponse);
    values(callbacks).forEach(visitCallback);
  });

  const visitPathItem = dereferenced(pathItem => {
    values(pathItem.parameters).forEach(visitParameter);
    ["get", "post", "put", "delete", "options", "head", "patch", "trace"]
      .map(op => pathItem[op])
      .filter(op => !!op)
      .forEach(visitOperation);
  });

  Object.values(openapi.paths).forEach(visitPathItem)
}

export function cleanOpenAPI(source) {
  try {
    const seen = new Set();
    visitOpenApi(source, seen);
    const target = structuredClone(source);
    [
      "schemas",
      "responses",
      "parameters",
      "examples",
      "requestBodies",
      "headers",
      "links",
      "callbacks",
      "pathItems"
    ]
    .filter(type => target.components[type] !== undefined)
    .forEach(type => {
      const refPrefix = `#/components/${type}/`;
      const keysToKeep = new Set(seen
        .values()
        .filter(ref => ref.startsWith(refPrefix))
        .map(ref => ref.substring(refPrefix.length))
      )
      const componentSet = target.components[type];
      for (const key of Object.keys(componentSet)) {
        if (! keysToKeep.has(key)) {
          delete componentSet[key];
        }
      }
    })

    return target

  } catch (e) {
    console.error(e);
    return null;
  }
}
