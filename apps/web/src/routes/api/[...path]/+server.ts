import { app as honoApp } from '@search-builder/api';
import type { RequestHandler } from './$types';

const handler: RequestHandler = ({ request }) => honoApp.fetch(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
