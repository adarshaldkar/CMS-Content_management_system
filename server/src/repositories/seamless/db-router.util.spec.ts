import {
  activeEngine,
  postgresStoreOf,
  mongoStoreOf,
  selectActiveReadRepo,
  shouldReplicateToMongo,
  shouldReplicateToPostgres,
  withEngineFailover,
} from './db-router.util';

interface StubRepo {
  findById(id: string): Promise<{ id: string; engine: string } | null>;
  create(data: { id: string }): Promise<{ id: string; engine: string }>;
}

const makeRepo = (engine: string): StubRepo => ({
  async findById(id: string) {
    if (id === 'missing') return null;
    return { id, engine };
  },
  async create(data) {
    return { id: data.id, engine };
  },
});

const POSTGRES = 'postgres';
const MONGO = 'mongodb';
type Active = typeof POSTGRES | typeof MONGO | 'mariadb' | 'mysql' | 'cockroach' | 'clickhouse';

describe('db-router.util', () => {
  const originalActiveDb = process.env.ACTIVE_DATABASE;

  const setActive = (engine: Active | undefined) => {
    if (engine === undefined) delete process.env.ACTIVE_DATABASE;
    else process.env.ACTIVE_DATABASE = engine;
  };

  afterEach(() => {
    setActive(originalActiveDb as Active | undefined);
  });

  describe('activeEngine', () => {
    it('assumes postgres when ACTIVE_DATABASE is not set', () => {
      setActive(undefined);
      expect(activeEngine()).toBe('postgres');
    });

    it('reads the configured engine', () => {
      setActive('mariadb');
      expect(activeEngine()).toBe('mariadb');
    });
  });

  describe('postgresStoreOf / mongoStoreOf', () => {
    it('resolves the postgres repo irrespective of construction order', () => {
      expect(postgresStoreOf('postgres', 'pg', 'mg')).toBe('pg');
      expect(postgresStoreOf('mongodb', 'pg', 'mg')).toBe('mg');
    });

    it('resolves the mongo repo irrespective of construction order', () => {
      expect(mongoStoreOf('mongodb', 'pg', 'mg')).toBe('pg');
      expect(mongoStoreOf('postgres', 'pg', 'mg')).toBe('mg');
    });
  });

  describe('selectActiveReadRepo', () => {
    const pg = makeRepo(POSTGRES);
    const mg = makeRepo(MONGO);
    const mariadb = makeRepo('mariadb');
    const mysql = makeRepo('mysql');
    const cockroach = makeRepo('cockroach');

    it('routes reads to mongo when active is mongodb', () => {
      setActive('mongodb');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, mysql, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'mongodb' });
    });

    it('routes reads to postgres when active is postgres', () => {
      setActive('postgres');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, mysql, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'postgres' });
    });

    it('routes reads through the mariadb repo when active is mariadb', () => {
      setActive('mariadb');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, mysql, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'mariadb' });
    });

    it('routes reads through the cockroach repo when active is cockroach', () => {
      setActive('cockroach');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, mysql, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'cockroach' });
    });

    it('falls back to postgres when the active engine has no repository', () => {
      setActive('mysql');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, undefined, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'postgres' });
    });

    it('falls back to postgres for clickhouse (analytics-only, never active)', () => {
      setActive('clickhouse');
      const repo = selectActiveReadRepo('postgres', pg, mg, mariadb, mysql, cockroach);
      return expect(repo.findById('x')).resolves.toEqual({ id: 'x', engine: 'postgres' });
    });
  });

  describe('withEngineFailover', () => {
    it('returns the fallback repo when no engine repo exists', () => {
      const fallback = makeRepo(POSTGRES);
      expect(withEngineFailover(undefined, fallback)).toBe(fallback);
    });

    it('delegates to the engine repo while it is healthy', async () => {
      const engine = makeRepo('mariadb');
      const fallback = makeRepo(POSTGRES);
      const proxy = withEngineFailover(engine, fallback);
      expect(proxy).not.toBe(engine);
      await expect(proxy.findById('x')).resolves.toEqual({ id: 'x', engine: 'mariadb' });
      await expect(proxy.create({ id: '1' })).resolves.toEqual({ id: '1', engine: 'mariadb' });
    });

    it('transparently retries on the postgres fallback when the engine rejects', async () => {
      const failingEngine: StubRepo = {
        async findById() {
          throw new Error('mariadb connection refused');
        },
        async create() {
          throw new Error('mariadb connection refused');
        },
      };
      const fallback = makeRepo(POSTGRES);
      const proxy = withEngineFailover(failingEngine, fallback);

      await expect(proxy.findById('x')).resolves.toEqual({ id: 'x', engine: 'postgres' });
      await expect(proxy.create({ id: '5' })).resolves.toEqual({ id: '5', engine: 'postgres' });
    });

    it('still returns null from the fallback when the record truly does not exist', async () => {
      const failingEngine: StubRepo = {
        async findById() {
          throw new Error('engine offline');
        },
        async create() {
          throw new Error('engine offline');
        },
      };
      const fallback = makeRepo(POSTGRES);
      const proxy = withEngineFailover(failingEngine, fallback);
      await expect(proxy.findById('missing')).resolves.toBeNull();
    });
  });

  describe('replication routing flags', () => {
    it('only syncs the other main store when postgres is active', () => {
      setActive('postgres');
      expect(shouldReplicateToPostgres()).toBe(false);
      expect(shouldReplicateToMongo()).toBe(true);
    });

    it('only syncs the other main store when mongodb is active', () => {
      setActive('mongodb');
      expect(shouldReplicateToPostgres()).toBe(true);
      expect(shouldReplicateToMongo()).toBe(false);
    });

    it('syncs BOTH main stores when a third engine is active', () => {
      setActive('mariadb');
      expect(shouldReplicateToPostgres()).toBe(true);
      expect(shouldReplicateToMongo()).toBe(true);

      setActive('cockroach');
      expect(shouldReplicateToPostgres()).toBe(true);
      expect(shouldReplicateToMongo()).toBe(true);
    });
  });
});