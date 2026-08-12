# Contributing

Work in one independently understandable vertical slice at a time. Start from the domain behavior and permission boundary, then add validation, persistence, route/UI behavior, and focused tests. Avoid generic CRUD abstractions that hide organization ownership or evidence semantics.

Before committing:

```bash
npm run verify
git diff --check
```

Use imperative milestone messages such as `Add interview scheduling conflicts`. Never commit `.env`, API keys, candidate resumes, coverage output, generated Prisma client files, or local storage. Add a new migration for schema changes; never modify a migration already applied outside your machine.

Pull requests should state purpose, inputs and outputs, dependencies, affected files/data, authorization, validation and error cases, security considerations, acceptance criteria, manual tests, and definition of done.
