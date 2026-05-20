import type { OperatorSpec } from '@search-builder/types';

export const githubOperators: OperatorSpec[] = [
  { key: 'repo', label: 'Repository', description: 'owner/name', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'torvalds/linux' },
  { key: 'user', label: 'User owner', description: 'Repos owned by user', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'torvalds' },
  { key: 'org', label: 'Organization owner', description: 'Repos owned by org', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'github' },
  { key: 'language', label: 'Language', description: 'Programming language', category: 'Filter', valueType: 'enum', supportsNegation: true, enumValues: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp', 'ruby', 'php', 'shell', 'kotlin', 'swift', 'scala', 'elixir', 'haskell', 'lua', 'r', 'dart'] },
  { key: 'path', label: 'File path contains', description: 'Path contains substring', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: 'src/' },
  { key: 'filename', label: 'File name', description: 'Match file name', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: '.env' },
  { key: 'extension', label: 'File extension', description: 'File extension without dot', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: 'env' },
  { key: 'in', label: 'Search location', description: 'Where to look', category: 'Filter', valueType: 'enum', supportsNegation: false, enumValues: ['file', 'path', 'file,path'] },
  { key: 'size', label: 'File size', description: 'Range, e.g. >10000', category: 'Filter', valueType: 'range', supportsNegation: false, placeholder: '>10000' },
  { key: 'fork', label: 'Include forks', description: 'Forks behaviour', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['only', 'true', 'false'] },
  { key: 'mirror', label: 'Is mirror', description: 'Mirror repos', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'archived', label: 'Archived repo', description: 'Archived state', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'is', label: 'Repo visibility', description: 'Visibility', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['public', 'private'] },
  { key: 'stars', label: 'Stars', description: 'Range, e.g. >100', category: 'Repo', valueType: 'range', supportsNegation: false, placeholder: '>100' },
  { key: 'forks', label: 'Forks', description: 'Range', category: 'Repo', valueType: 'range', supportsNegation: false },
  { key: 'created', label: 'Repo created at', description: 'Date range', category: 'Repo', valueType: 'date-range', supportsNegation: false, placeholder: '>2024-01-01' },
  { key: 'pushed', label: 'Last push', description: 'Date range', category: 'Repo', valueType: 'date-range', supportsNegation: false },
  { key: 'license', label: 'License', description: 'SPDX license id', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause', 'agpl-3.0', 'lgpl-3.0', 'mpl-2.0', 'unlicense'] },
  { key: 'topic', label: 'Repo topic', description: 'Topic tag', category: 'Repo', valueType: 'text', supportsNegation: true },
];
