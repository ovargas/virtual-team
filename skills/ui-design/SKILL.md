---
name: ui-design
description: Frontend coding standards and component patterns. Load this skill whenever writing or modifying frontend code — components, pages, hooks, styling, state management, or anything that renders UI. Trigger on any work touching .tsx, .jsx, .css, .scss files or frontend directories.
---

# UI Design Standards

These are the rules for writing frontend code in this project. Follow them when creating or modifying components, pages, hooks, styles, and frontend tests.

## Component Structure

<!-- CUSTOMIZE: Define your component conventions -->

### File Organization
- One component per file
- File name matches component name: `UserProfile.tsx` exports `UserProfile`
- Co-locate related files:
  ```
  components/
    UserProfile/
      UserProfile.tsx        ← component
      UserProfile.test.tsx   ← tests
      useUserProfile.ts      ← component-specific hook (if needed)
      index.ts               ← re-export
  ```

### Component Anatomy
<!-- CUSTOMIZE: Replace with your actual preferred pattern -->
```
1. Imports (external, then internal, then types)
2. Type definitions (Props interface)
3. Component function
4. Hooks (all at the top, before any logic)
5. Derived state / computations
6. Event handlers
7. Effects
8. Render
```

### Naming
- Components: PascalCase (`UserProfile`, `TaskList`)
- Hooks: camelCase with `use` prefix (`useAuth`, `useTaskList`)
- Event handlers: `handle` + Event (`handleClick`, `handleSubmit`)
- Props: describe the data, not the implementation (`userName`, not `userNameString`)
- Boolean props: `is`/`has`/`can` prefix (`isLoading`, `hasError`, `canEdit`)

## State Management

<!-- CUSTOMIZE: Define your state management approach -->

### When to Use What
- **Component state (useState):** UI-only state — open/closed, selected tab, form input values
- **Shared state (context/store):** State needed by multiple unrelated components — current user, theme, feature flags
- **Server state (data fetching):** Data from APIs — use your data fetching library's caching, not local state
- **URL state:** State that should survive page refresh or be shareable — filters, pagination, selected item

### Rules
- Lift state only when two components genuinely need the same data
- Don't put everything in global state — most state is local
- Derive values instead of syncing state (compute from existing state, don't duplicate)
- Never store derived data in state if it can be computed

## Styling

<!-- CUSTOMIZE: Replace with your styling approach (Tailwind, CSS modules, styled-components, etc.) -->

### Approach: [Your styling system]
- [Primary styling method and rules]
- [Responsive breakpoints and approach]
- [Spacing and sizing conventions]
- [Color usage — reference design tokens or variables]

### Rules
- No inline styles except for truly dynamic values (e.g., computed positions)
- No magic numbers — use spacing scale / design tokens
- Mobile-first: start with mobile layout, add complexity for larger screens
- Component styles are scoped — a component's styles should not affect its children's internal layout

## Accessibility

### Non-negotiable
- All interactive elements are keyboard accessible (tab, enter, escape)
- All images have alt text (decorative images use `alt=""`)
- Form inputs have associated labels (not just placeholder text)
- Color is never the only indicator of state (add icons, text, or patterns)
- Focus states are visible and obvious

### Semantic HTML
- Use `<button>` for actions, `<a>` for navigation — never `<div onClick>`
- Use heading hierarchy (`h1` → `h2` → `h3`, never skip levels)
- Use landmark elements (`<main>`, `<nav>`, `<aside>`)
- Use lists (`<ul>`, `<ol>`) for groups of related items

## Navigation — No Dead Ends

**Every screen must have an escape route.** If the user reaches a view with no back button, no navigation drawer, no tab bar, and no other way to leave — that's a dead end. Dead ends are especially common in mobile UIs after completing a flow (success screens, confirmation pages, detail views opened from notifications).

This is not a hard requirement to add navigation elements to every screen. It is a **mandatory check during `/implement`**: when building a view, assess whether the user has a way to navigate away. If they don't, raise it.

### When Implementing a Screen

After the UI is functional, check:
1. **Does this screen have a back button, close button, or navigation element** (tab bar, drawer, breadcrumb) that takes the user somewhere else?
2. **If the user completes the action on this screen** (submits a form, finishes a flow), **where do they go?** If the answer is "nowhere," there's a problem.
3. **If the user arrived here from a notification or deep link**, can they get to the home screen?

### If a Dead End Is Found

Don't silently add navigation. Instead, flag it:

```
⚠️ Navigation dead end detected:

This screen ([screen name]) has no way to navigate away after [action].
The user would be stuck here.

Some options:
1. Add a "Back to [parent]" button in the header/toolbar
2. Add a "Go to Home" fallback link
3. Auto-navigate to [destination] after [action] completes
4. This is intentional (explain why)
5. Something else — describe what you'd prefer

What would you like to do?
```

### Common Dead-End Patterns to Watch For
- **Success/confirmation screens** — "Payment complete!" with no next step
- **Detail views opened from push notifications** — no navigation stack to pop back to
- **Modal flows that dismiss to nowhere** — the originating screen was unmounted
- **Error screens** — "Something went wrong" with no retry or home link
- **Onboarding final step** — welcome screen with no route to the main app

## Error Handling

- Show error states inline near the failed action, not as distant toast notifications (unless the action was global)
- Provide a recovery action when possible ("Retry", "Go back", "Try a different approach")
- Never show raw error messages or stack traces to users
- Loading states: show skeleton/placeholder for content, spinner for actions
- Empty states: explain what goes here and how to add the first item

## Testing

<!-- CUSTOMIZE: Replace with your test framework and conventions -->

### What to Test
- User interactions: "when I click X, Y happens"
- Conditional rendering: "when [condition], show [element]"
- Form validation: "when I submit with invalid data, show [error]"
- Edge cases: empty state, loading state, error state, overflow content

### What NOT to Test
- Implementation details (which function was called, internal state shape)
- Third-party library behavior
- Pure styling (unless visual regression testing is set up)

### Pattern
```
describe('[ComponentName]', () => {
  it('should [observable behavior] when [condition]', () => {
    // Arrange: render with specific props/state
    // Act: simulate user interaction
    // Assert: check what the user sees/experiences
  })
})
```

## Performance

- Lazy-load routes/pages — don't bundle everything upfront
- Optimize images: appropriate format, size, and loading strategy
- Don't over-memoize — only memoize when there's a measured problem
- Avoid layout thrashing: batch DOM reads before DOM writes
- Large lists: use virtualization (only render visible items)
