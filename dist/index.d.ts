#!/usr/bin/env node
/**
 * Soumit Intelligence Engine - Official Model Context Protocol (MCP) Server & API
 *
 * Enables Claude Desktop, Claude Code, Cursor, Windsurf, ChatGPT, and Autonomous Agents
 * to search, analyze, and verify Moroccan public tenders (Marchés Publics Maroc)
 * under Décret n° 2-22-431 and Loi n° 69-21.
 *
 * Maintained by VEXT AI (https://vext.ma)
 */
import readline from "readline";
import { TOOLS, type ToolDefinition } from "./tools";
import { computeDecreeCompliance, type DecreeComplianceInput, type DecreeComplianceResult } from "./compliance";
export { TOOLS, type ToolDefinition, computeDecreeCompliance, type DecreeComplianceInput, type DecreeComplianceResult };
export declare const SOUMIT_API_URL: string;
export declare const SOUMIT_API_KEY: string;
export declare function callSoumitApi(path: string, options?: RequestInit): Promise<any>;
export declare function handleToolCall(name: string, args: Record<string, any>): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
export declare function startStdioServer(): readline.Interface;
//# sourceMappingURL=index.d.ts.map