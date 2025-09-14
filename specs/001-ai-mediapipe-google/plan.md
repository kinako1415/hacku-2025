# Implementation Plan: AI駆動手首・母指可動域リハビリテーションアプリ

**Branch**: `001-ai-mediapipe-google` | **Date**: 2025年9月14日 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-mediapipe-google/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
手首・母指の可動域をカメラとAI骨格推定で自動測定し、毎日の記録をカレンダー形式で管理するリハビリテーション支援Webアプリケーション。Next.js、TypeScript、MediaPipe Handsを使用して、±5°精度での可動域測定と進捗追跡を実現。

## Technical Context
**Language/Version**: TypeScript, Node.js 18+, React 18+  
**Primary Dependencies**: Next.js (App Router), MediaPipe Hands/Pose (JS), jotai, module.scss  
**Storage**: IndexedDB, Web Storage (LocalStorage/SessionStorage)  
**Testing**: Jest, React Testing Library, Playwright (E2E)  
**Target Platform**: Web (Chrome/Safari/Firefox, モバイル対応)
**Project Type**: web (frontend + backend API routes)  
**Performance Goals**: リアルタイム動作追跡 (30fps), 測定精度±5°, 応答時間<200ms  
**Constraints**: カメラアクセス必須, オフライン対応, PWA対応推奨  
**Scale/Scope**: 個人利用アプリ, 長期データ保存対応, 医療データプライバシー準拠

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (Next.js app with API routes)
- Using framework directly? Yes (Next.js App Router直接使用)
- Single data model? Yes (測定データ統一モデル)
- Avoiding patterns? Yes (複雑な抽象化を避ける)

**Architecture**:
- EVERY feature as library? Yes
- Libraries listed: 
  - mediapipe-motion-capture (動作測定)
  - motion-data-manager (データ管理)
  - calendar-tracker (カレンダー記録)
- CLI per library: Yes (--help/--version/--format対応)
- Library docs: llms.txt format planned? Yes

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (実際のIndexedDB使用)
- Integration tests for: 新ライブラリ、契約変更、共有スキーマ? Yes

**Observability**:
- Structured logging included? Yes (console構造化ログ)
- Frontend logs → backend? Yes (統一ログストリーム)
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? 1.0.0
- BUILD increments on every change? Yes
- Breaking changes handled? Yes (並行テスト、移行計画)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - frontend + backend API routes

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/bash/update-agent-context.sh copilot` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base template
- Generate from Phase 1 artifacts: API contracts, data model, quickstart scenarios
- Each API endpoint → contract test task [P]
- Each entity (User, MotionMeasurement, CalendarRecord, ProgressData) → model creation task [P]
- Each user story from quickstart → integration test task
- MediaPipe integration → specialized tasks for camera, pose detection, angle calculation
- Implementation tasks ordered to make tests pass (TDD approach)

**Ordering Strategy**:
- **Phase 1 Tasks**: Infrastructure & Contracts
  1. Project setup (Next.js, TypeScript, dependencies)
  2. Contract test creation (API spec validation)
  3. Data model implementation (TypeScript types + Dexie schema)
  
- **Phase 2 Tasks**: Core Libraries [P]
  4. MediaPipe integration library (camera, hands/pose detection)
  5. Motion calculation library (angle computation, validation)
  6. Data management library (IndexedDB operations, CRUD)
  7. Calendar tracking library (date operations, memo management)
  
- **Phase 3 Tasks**: Integration & UI
  8. Integration tests (MediaPipe + data flow)
  9. React components (measurement UI, calendar UI, progress UI)
  10. State management (Jotai atoms for measurement, calendar states)
  
- **Phase 4 Tasks**: E2E & Polish
  11. End-to-end tests (quickstart scenario automation)
  12. Error handling & edge cases
  13. PWA setup & optimization
  14. Documentation & deployment preparation

**Parallel Execution Markers [P]**:
- Independent libraries can be developed in parallel
- Component development can proceed alongside library implementation
- Contract tests can run independently

**Estimated Output**: 30-35 numbered, dependency-ordered tasks in tasks.md following TDD principles

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (None required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*