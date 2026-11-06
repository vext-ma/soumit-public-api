export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export declare const TOOLS: ToolDefinition[];
//# sourceMappingURL=tools.d.ts.map