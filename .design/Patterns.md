# Pattern Library

> Reusable code patterns and conventions for Parade

This library documents successful patterns used across the application. Discovery and implementation agents should reference this to maintain consistency and avoid reinventing solutions.

---

## State Management

### Zustand Store Pattern

Standard pattern for creating Zustand stores with TypeScript.

```typescript
import { create } from 'zustand';

interface StoreState {
  items: Item[];
  loading: boolean;
  error: string | null;

  // Actions
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  items: [],
  loading: false,
  error: null,

  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

**When to use**: Any shared state that needs to persist across components.

**Location**: `src/renderer/store/`

---

### Store with Async Actions

Pattern for stores with data fetching.

```typescript
export const useDataStore = create<DataState>((set, get) => ({
  data: [],
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.getData();
      set({ data: result, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      });
    }
  },

  // Optimistic update pattern
  updateItem: async (id: string, updates: Partial<Item>) => {
    const previous = get().data;
    // Optimistic update
    set((state) => ({
      data: state.data.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
    try {
      await window.api.updateItem(id, updates);
    } catch (error) {
      // Rollback on error
      set({ data: previous });
      throw error;
    }
  },
}));
```

---

## Electron IPC

### IPC Handler Pattern (Main Process)

Standard pattern for Electron IPC handlers.

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';

// In src/main/ipc/handlers.ts
ipcMain.handle(IPC_CHANNELS.FEATURE.ACTION, async (_, params: ParamType) => {
  try {
    const result = await service.performAction(params);
    return { success: true, data: result };
  } catch (error) {
    console.error('IPC error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
```

**Location**: `src/main/ipc/handlers.ts`

---

### Preload API Pattern

Exposing IPC to renderer via preload.

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Feature namespace
  feature: {
    action: (params: ParamType) =>
      ipcRenderer.invoke(IPC_CHANNELS.FEATURE.ACTION, params),
  },
};

contextBridge.exposeInMainWorld('api', api);
```

---

### Client Library Pattern

Typed client wrapper for renderer.

```typescript
// src/renderer/lib/featureClient.ts
export const featureClient = {
  async performAction(params: ParamType): Promise<ResultType> {
    const response = await window.api.feature.action(params);
    if (!response.success) {
      throw new Error(response.error || 'Action failed');
    }
    return response.data;
  },
};
```

**Location**: `src/renderer/lib/`

---

## Data Fetching

### useEffect Data Loading

Standard pattern for loading data on mount.

```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const result = await client.fetchData();
      if (!cancelled) {
        setData(result);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadData();

  return () => {
    cancelled = true;
  };
}, [dependency]);
```

---

### Polling Pattern

For data that needs periodic refresh.

```typescript
useEffect(() => {
  // Initial fetch
  fetchData();

  // Set up polling
  const interval = setInterval(fetchData, 5000); // 5 seconds

  return () => clearInterval(interval);
}, []);
```

---

## Component Patterns

### Conditional Rendering with Loading/Error States

```typescript
function DataDisplay({ id }: { id: string }) {
  const { data, loading, error } = useDataStore();

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        <p>Error: {error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  if (!data) {
    return <EmptyState message="No data found" />;
  }

  return <DataContent data={data} />;
}
```

---

### Card Selection Pattern

For selectable card lists (e.g., brief selection).

```typescript
interface SelectableCardProps {
  item: Item;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SelectableCard({ item, isSelected, onSelect }: SelectableCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        'hover:bg-slate-800',
        isSelected && 'ring-2 ring-sky-500 border-sky-500'
      )}
      onClick={() => onSelect(item.id)}
    >
      <CardContent className="p-3">
        <h4 className="font-medium text-sm text-slate-100">{item.title}</h4>
      </CardContent>
    </Card>
  );
}
```

---

### Status Badge Pattern

Consistent status display with colors.

```typescript
const STATUS_COLORS: Record<Status, string> = {
  open: 'bg-slate-700 text-slate-300',
  in_progress: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  blocked: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  closed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

---

## Form Patterns

### Controlled Form with Validation

```typescript
interface FormData {
  title: string;
  priority: Priority;
}

function CreateForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    priority: 2,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
      </div>
      <Button type="submit">Create</Button>
    </form>
  );
}
```

---

## Service Patterns

### SQLite Service Pattern

Pattern for database service classes.

```typescript
// src/main/services/featureService.ts
import Database from 'better-sqlite3';

class FeatureService {
  private db: Database.Database | null = null;

  setDatabase(db: Database.Database) {
    this.db = db;
  }

  private ensureDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  getAll(): Feature[] {
    const db = this.ensureDb();
    return db.prepare('SELECT * FROM features ORDER BY created_at DESC').all() as Feature[];
  }

  getById(id: string): Feature | null {
    const db = this.ensureDb();
    return db.prepare('SELECT * FROM features WHERE id = ?').get(id) as Feature | null;
  }

  create(params: CreateFeatureParams): Feature {
    const db = this.ensureDb();
    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO features (id, title, status, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, params.title, 'draft', now);

    return this.getById(id)!;
  }
}

export const featureService = new FeatureService();
```

**Location**: `src/main/services/`

---

## Testing Patterns

### Vitest Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders with props', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

---

### Service Unit Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { featureService } from './featureService';

describe('FeatureService', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`CREATE TABLE features (...)`);
    featureService.setDatabase(db);
  });

  it('creates a feature', () => {
    const feature = featureService.create({ title: 'Test' });
    expect(feature.title).toBe('Test');
    expect(feature.id).toBeDefined();
  });
});
```

---

## Error Handling Patterns

### Try-Catch with Typed Errors

```typescript
class FeatureError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FeatureError';
  }
}

async function performAction(): Promise<Result> {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    if (error instanceof FeatureError) {
      // Handle known error
      console.error(`Feature error [${error.code}]:`, error.message);
      throw error;
    }
    // Wrap unknown errors
    throw new FeatureError(
      error instanceof Error ? error.message : 'Unknown error',
      'UNKNOWN'
    );
  }
}
```

---

## Feature-Specific Patterns

*This section is updated by `/evolve` as new patterns are discovered.*

| Pattern | Description | Location | Added |
|---------|-------------|----------|-------|
| - | No feature patterns yet | - | - |

---

*Last updated: January 2025*
*Updated by /evolve when new patterns are discovered*
