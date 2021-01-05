A plugin for [graphql-code-generator](https://graphql-code-generator.com/) that will output the subset of a large schema that is actually used by GraphQL operations.

## Background

In the Xometry service architecture, each GraphQL API is joined together using [GraphQL federation](https://www.apollographql.com/docs/federation/). These are called "API providers".

Each GraphQL API consumers (frontend or backend) may use only a small portion of the full API provided by a service. In order for the [API catalog](https://github.com/xometry/api-catalog) to function properly, it wants each
consumer to declare only the fields that it actually uses and needs, rather than all possible fields. This GraphQL plugin helps accomplish that goal, but automatically generating a *subset schema* from a large schema
and a set of operations. This subset schema can then be checked into the consumer repository and used for subsequent code generation runs.

## Installation

`yarn add --dev graphql-code-generator-subset-plugin`

## Usage

This plugin would not typically be used by CI/CD processes. Instead it would be used by developers when updating a consumer to
changes in a consumed API. You probably want to write a separate `codegen.yml` file for developers to run this as-needed. Suggestion: name this file `codegen-subsetschema.yml`.

This is a simple output plugin for graphql-code-generator, and so you configure it by adding the following snippet to your `codegen-subsetschema.yml` file:

```yaml
generates:
  my-consumed-schema.graphql
    - graphql-code-generator-subset-plugin
```

As a simple example, see the [examples/github](examples/github) directory, where we generate a small subset of the github API schema.
