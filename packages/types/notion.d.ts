type PropertyType =
    | 'title'
    | 'rich_text'
    | 'number'
    | 'select'
    | 'multi_select'
    | 'date'
    | 'people'
    | 'files'
    | 'checkbox'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'formula'
    | 'relation'
    | 'rollup'
    | 'created_time'
    | 'created_by'
    | 'last_edited_time'
    | 'last_edited_by';

type UserField = 'id' | 'name' | 'avatar_url' | 'email';

interface BasePropertySchema {
    type: PropertyType;
    key?: boolean;
}

interface UserPropertySchema extends BasePropertySchema {
    type: 'created_by' | 'last_edited_by';
    include?: UserField[];
}

interface RelationPropertySchema extends BasePropertySchema {
    type: 'relation';
    fetchRelated?: boolean;
}

type PropertySchema =
    | BasePropertySchema
    | UserPropertySchema
    | RelationPropertySchema;

interface DatabaseSchema {
    id: string;
    properties: Record<string, PropertySchema>;
}

type InferPropertyType<T extends PropertySchema> = T extends {
    type: 'title' | 'rich_text';
}
    ? string
    : T extends { type: 'number' }
      ? number
      : T extends { type: 'select' }
        ? string | null
        : T extends { type: 'multi_select' }
          ? string[]
          : T extends { type: 'date' }
            ? string | null
            : T extends { type: 'checkbox' }
              ? boolean
              : T extends { type: 'relation' }
                ? T extends { fetchRelated: true }
                    ? Array<{ id: string; title: string | null }>
                    : string[]
                : T extends { type: 'created_by' | 'last_edited_by' }
                  ? T extends { include: UserField[] }
                      ? Pick<
                            {
                                id: string;
                                name: string;
                                avatar_url: string;
                                email: string;
                            },
                            T['include'][number]
                        >
                      : string
                  : any;

type InferSchemaType<T extends DatabaseSchema> = {
    [K in keyof T['properties']]: InferPropertyType<T['properties'][K]>;
} & { pageId: string };

interface inlineDB {
    databaseId: string;
    databaseName: string;
}