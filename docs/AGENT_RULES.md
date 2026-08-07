# SmartDocs - Agent Rules

These rules are mandatory for every implementation.

If any rule conflicts with generated code, the rule always wins.

---

# General

- Read the architecture documents before making implementation decisions.
- Never change the folder structure without explicit instruction.
- Never install packages that are not part of the approved tech stack.
- Never remove existing functionality while implementing a new feature.
- Think → Plan → Implement.
- Explain the implementation plan before generating code.
- If a task is too large, split it into smaller logical tasks.
- Keep solutions simple and readable.

---

# TypeScript

- Enable strict TypeScript.
- Never use `any`.
- Prefer explicit types.
- Use interfaces for API contracts.
- Use type aliases where appropriate.
- Avoid unnecessary type assertions.

---

# React

- Build reusable components.
- Keep components focused on one responsibility.
- Prefer composition over prop drilling.
- Move business logic into hooks.
- Never fetch data directly inside components.
- Never place complex logic inside JSX.

---

# TanStack Query

- Use TanStack Query for every server request.
- Use `useQuery` for reads.
- Use `useMutation` for writes.
- Handle loading, success and error states.
- Invalidate queries after successful mutations.
- Never use `useEffect` for data fetching when Query can handle it.

---

# UI

- Build mobile-first.
- Support dark mode.
- Every button must have hover and disabled states.
- Every async action must have visual feedback.
- Every page must have loading, empty and error states.
- Use skeletons instead of blank loading screens.
- Keep animations subtle and under ~250ms.
- Use Sonner for notifications.
- Never use browser alerts.
- Use consistent spacing throughout the application.

---

# Architecture

- Controllers only receive requests and return responses.
- Business logic belongs in services.
- External providers must only be accessed through services.
- Long-running work belongs in Inngest jobs.
- Keep files small and focused.
- Avoid duplicate code.

---

# AI

- Never call OpenAI directly from controllers.
- Always retrieve context before generating answers.
- Keep RAG restricted to the active workspace.
- Always include citations when available.
- Stream AI responses.
- Never block the UI while AI is processing.
- Limit answer verification to three iterations.

---

# Validation

- Validate every API request with Zod.
- Never trust client input.
- Return meaningful validation errors.

---

# Error Handling

- Catch expected errors.
- Never expose stack traces to users.
- Show friendly error messages.
- Log useful debugging information.

---

# Environment

- Never hardcode secrets.
- Read secrets only from environment variables.
- Never commit `.env` files.

---

# Code Quality

- Prefer readability over cleverness.
- Remove dead code.
- Avoid unnecessary comments.
- Use descriptive variable names.
- Reuse existing utilities before creating new ones.
- Follow the project architecture at all times.

---

# Final Rule

Every implementation should make SmartDocs feel like a polished AI product, not just a collection of features.