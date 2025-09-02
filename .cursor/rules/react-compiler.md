### React Compiler: research summary and project policy

This project enables the React Compiler (`experimental.reactCompiler: true` in `apps/app/next.config.ts`). We prefer global compilation mode per team preference.

#### Key takeaways
- The compiler auto-memoizes many simple cases but is not a full replacement for `React.memo`, `useMemo`, and `useCallback` in complex UIs.
- Real-world pitfalls often require small refactors to unlock compiler wins.

#### Actionable patterns (do this)
- Use stable keys in lists; avoid `key={index}`.
- Extract complex list items into dedicated components so internals can be memoized independently.
- If a hook returns an object with a stable callback (e.g., `{ mutate }`), depend on the callback, not the entire object.
- Hoist or memoize inline arrays/objects used as props when they cause identity churn.
- Keep manual memoization for hot paths, expensive compute, and third-party equality-sensitive props.

#### Debugging workflow
- Use React DevTools Profiler to confirm render behavior. "memo ✨" indicators aren’t sufficient alone.
- If unwanted re-renders persist: fix keys, extract children, swap object deps for stable members, hoist constants.

#### Lint and CI
- Enforce `eslint-plugin-react-hooks` and add a rule discouraging `key={index}` (except static lists).

#### References
- DeveloperWay: “I tried React Compiler today, and guess what...” — real-world behavior, common fixes, and limitations. [developerway.com](https://www.developerway.com/posts/i-tried-react-compiler)
- React Docs: React Compiler overview and installation. [react.dev](https://react.dev/learn/react-compiler)
