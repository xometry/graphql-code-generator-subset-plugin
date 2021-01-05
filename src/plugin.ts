import {
  DocumentNode,
  getNamedType,
  GraphQLSchema,
  GraphQLType,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  printSchema,
  isObjectType,
  isInterfaceType,
} from "graphql";
import { Types, PluginFunction } from "@graphql-codegen/plugin-helpers";

export const plugin: PluginFunction = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[]
) => {
  if (documents.length < 1) {
    throw new Error(
      "The subsetting plugin only works when at least one operation document has been specified."
    );
  }

  const typeInfo = new TypeInfo(schema);
  const usedObjectFields = new Map<string, Set<string>>(); // objects and interfaces
  const otherUsedTypes = new Set<string>();

  function visitType(type: GraphQLType | undefined | null) {
    if (!type) {
      return;
    }
    const resolvedType = getNamedType(type);
    const kind = resolvedType.astNode?.kind;
    if (kind !== "ObjectTypeDefinition" && kind !== "InterfaceTypeDefinition") {
      otherUsedTypes.add(resolvedType.name);
    }
  }

  function visitField(parentTypeName: string, fieldName: string) {
    let fieldMap: Set<string> | undefined = usedObjectFields.get(
      parentTypeName
    );
    if (fieldMap === undefined) {
      fieldMap = new Set();
      usedObjectFields.set(parentTypeName, fieldMap);
    }
    fieldMap.add(fieldName);
  }

  const documentsVisitor = visitWithTypeInfo(typeInfo, {
    enter(node) {
      // Record any type referenced by the AST in any way
      visitType(typeInfo.getType());
      visitType(typeInfo.getInputType());

      // For objects, record which fields were selected
      if (node.kind === "Field") {
        const parentTypeName = typeInfo.getParentType()?.name as string;
        const fieldName = node.name.value;
        visitField(parentTypeName, fieldName);
      }
    },
  });
  documents.forEach((doc) =>
    visit(doc.document as DocumentNode, documentsVisitor)
  );

  // 1a. remove unused types
  // 2a. remove unused interface fields
  // 2b. re-add used interface fields to their implementing objects, even if the object field is not used directly
  // 3a. remove unused object fields
  // 3b. remove unused implemented interfaces

  const typeMap = schema.getTypeMap();

  function findImplementers(ifacename: string) {
    return Object.values(typeMap).filter((type) => {
      return (
        isObjectType(type) &&
        type.getInterfaces().some((iface) => iface.name === ifacename)
      );
    });
  }

  for (const typeName of Object.keys(typeMap)) {
    if (!(usedObjectFields.has(typeName) || otherUsedTypes.has(typeName))) {
      delete typeMap[typeName];
    }
  }

  for (const [typeName, type] of Object.entries(typeMap)) {
    if (isInterfaceType(type)) {
      const usedFields = usedObjectFields.get(typeName);
      const implementers = findImplementers(type.name);
      const fieldMap = type.getFields();
      for (const fieldName of Object.keys(fieldMap)) {
        if (!usedFields?.has(fieldName)) {
          delete fieldMap[fieldName];
        } else {
          implementers.forEach((objectType) =>
            visitField(objectType.name, fieldName)
          );
        }
      }
    }
  }

  for (const [typeName, type] of Object.entries(typeMap)) {
    if (isObjectType(type)) {
      const usedFields = usedObjectFields.get(typeName);
      const fieldMap = type.getFields();
      for (const fieldName of Object.keys(fieldMap)) {
        if (!usedFields?.has(fieldName)) {
          delete fieldMap[fieldName];
        }
      }

      const interfaces = type.getInterfaces();
      // mutating an array during forEach is bad mojo, so we use a reverse array loop
      for (let i = interfaces.length - 1; i >= 0; i -= 1) {
        const iface = interfaces[i];
        if (!usedObjectFields.has(iface.name)) {
          interfaces.splice(i, 1);
        }
      }
    }
  }
  return printSchema(schema);
};
