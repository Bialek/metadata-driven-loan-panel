# Panel wniosków pożyczkowych – Tabela sterowana metadanymi

Aplikacja frontendowa dla panelu zarządzania wnioskami pożyczkowymi, w której struktura, typy danych, zachowanie kolumn (sortowanie, filtrowanie, widoczność, kolejność) oraz uprawnienia do akcji wynikają z metadanych (`columns.json`), a nie ze statycznego kodu.

Projekt zrealizowany w technologii **React 19**, **TypeScript 5.7**, **Vite 6** oraz **Vitest** z **React Testing Library** i czystym **CSS Modules**.

---

## 1. Instrukcja uruchomienia i skrypty

### Wymagania wstępne
- Node.js: wersja 18+ (testowano na Node v24.18)
- npm: wersja 9+ (testowano na npm 11.16)

### Instalacja zależności
```bash
npm install
```

### Dostępne skrypty

| Skrypt | Polecenie | Opis |
|---|---|---|
| **dev** | `npm run dev` | Uruchamia serwer deweloperski Vite pod adresem `http://localhost:5173/` |
| **typecheck** | `npm run typecheck` | Uruchamia kompilator TypeScript (`tsc --noEmit`) w trybie ścisłym |
| **test** | `npm run test` | Uruchamia pełny zestaw testów automatycznych w Vitest (44 testy) |
| **test:watch** | `npm run test:watch` | Uruchamia Vitest w trybie interaktywnym (watch) |
| **build** | `npm run build` | Weryfikuje typy i buduje zoptymalizowany bundle produkcyjny do katalogu `dist/` |
| **preview** | `npm run preview` | Uruchamia lokalny serwer podglądu zbudowanej aplikacji produkcyjnej |

---

## 2. Przyjęty model metadanych i architektura danych

Architektura opiera się na wyraźnym rozdziale warstw za pomocą wzorca **Adapter / Data Boundary**:

```
[ Backend / JSON Fixtures ]
   /data/columns.json  &  /data/rows.json (serwowane z public/data/)
            │
            ▼
[ tableRepository.ts ]  ─── Równoległe pobieranie (Promise.all), walidacja statusów HTTP i tablic JSON
            │
            ▼
[ tableAdapter.ts ]     ─── Normalizacja kolumn i wierszy:
                            • Domyślne wartości: visible=true, order=sourceIndex
                            • Sortowanie kolumn wg 'order'
                            • Normalizacja uprawnień: permissions.canEdit -> values.canEdit (fail-closed)
                            • Deterministyczne ID i obsługa duplikatów
            │
            ▼
[ App.tsx ]             ─── Asynchroniczny stan pobierania (loading | error | success),
                            obsługa ponawiania (retry) i powiadomienia o akcjach
            │
            ▼
[ DataTable.tsx ]       ─── Generyczny komponent tabeli (nie zna domenowych 'permissions'):
                            • Stan filtrów, sortowania i bieżącej strony
                            • Pipeline: filtrowanie → sortowanie → paginacja
                            • Pochodne wiersze (useMemo), bez kopiowania ich do stanu
                            • Synchronizacja widoku z parametrami URL
                            • Dostępne nagłówki z aria-sort
                            • Renderery komórek wg typu metadanych
```

### Modele TypeScript (Granice DTO vs Normalized)

```ts
// 1. Definicja metadanych kolumny z API
export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'badge' | 'action';

export interface RawColumn {
  key: string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  order?: number;
  options?: readonly string[];
  action?: string;
  currency?: string;
}

// 2. Znormalizowana kolumna gwarantująca obecność kluczowych flag
export interface NormalizedColumn extends RawColumn {
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  order: number;
  sourceIndex: number;
}

// 3. Surowy obiekt wiersza z API
export interface LoanRowDto {
  loanId?: string | null;
  customerName?: string | null;
  status?: string | null;
  market?: string | null;
  monthlyRate?: number | null;
  updatedAt?: string | null;
  permissions?: { canEdit?: boolean | null } | null;
}

// 4. Znormalizowany generyczny wiersz tabeli
export interface TableRow {
  id: string;
  sourceIndex: number;
  values: Record<string, CellValue>;
}
```

---

## 3. Kluczowe decyzje techniczne i założenia projektowe

1. **Brak twardo zakodowanych kolumn (R5, R6, R7):**
   - Kolumny tabeli wynikają w 100% z tablicy metadanych.
   - Kolumna z `visible: false` jest pomijana podczas renderowania. Brak właściwości `visible` traktowany jest jako domyślnie widoczna (`visible = true`).
   - Właściwość `order` steruje pozycją kolumny; kolumny bez podanego `order` zachowują kolejność z pliku wejściowego (`sourceIndex`).

2. **Normalizacja uprawnień na granicy danych (R15, R16):**
   - W danych wejściowych uprawnienie znajduje się w zagnieżdżonym obiekcie `permissions.canEdit`.
   - Adapter mapuje `permissions.canEdit` na komórkę `row.values.canEdit`.
   - Generyczna tabela `DataTable` nie wie nic o polu `permissions` ani logice biznesowej wniosków.
   - **Fail-closed:** Brak obiektu `permissions` lub wartość `null` traktowane są bezpiecznie jako brak uprawnień (`canEdit = false`).
   - Niedostępna akcja jest renderowana jako **prawdziwy przycisk HTML `<button disabled>`** z wygaszonym stylem, zablokowanym kursorem oraz uniemożliwionym wywołaniem zdarzenia kliknięcia.

3. **Formatowanie kwot i walut:**
   - W metadanych kolumna `monthlyRate` ma typ `currency`, lecz nie definiuje kodu waluty. Zgodnie z wytycznymi nie zgadujemy waluty ani nie wiążemy jej na sztywno z rynkiem (`market`).
   - Kwota formatowana jest w polskiej konwencji z 2 miejscami po przecinku (np. `1 409,27`), z obsługą opcjonalnej przyszłej właściwości `currency` na definicji kolumny.

4. **Strefa czasowa dat:**
   - Znaczniki czasu w danych zapisane są jako UTC (`2026-01-22T19:00:00Z`).
   - Daty wyświetlane są w strefie `Europe/Warsaw` za pomocą `Intl.DateTimeFormat`.

5. **Wielopolowe wyszukiwanie z polską diakrytyką (R13, R14):**
   - Wyszukiwarka tekstowa automatycznie obejmuje **wszystkie widoczne i oznaczone jako `filterable` kolumny tekstowe** (`loanId`, `customerName`, `market`).
   - Wyszukiwanie normalizuje wielkość liter, ignoruje akcenty (NFD) oraz specjalnie traktuje polski znak `ł` / `Ł` (wyszukanie "wozniak" znajduje "Anna Woźniak", "zielinska" znajduje "Marcin Zielińska", a "de" znajduje rynek niemiecki).
   - Wyszukiwanie tekstowe i filtr statusu łączone są koniunkcją logiczną (`AND`).

6. **Dynamiczny filtr statusu z metadanych (R12):**
   - Lista opcji pochodzi z `options` filtrowalnej kolumny typu `badge`.
   - Filtr korzysta z `key` tej kolumny, więc tabela nie zakłada nazwy pola `status`.
   - Identyfikatory maszynowe (`new`, `in_review`, `approved`, `rejected`) są spójnie humanizowane.

7. **Obsługa brakujących wartości i stabilność sortowania (R10, R11):**
   - Wartości `null`, `undefined`, puste ciągi znaków, liczby niefiniszowe (`NaN`) oraz niepoprawne daty renderowane są jednolicie jako pauza (`—`).
   - **Brakujące wartości zawsze sortują się na samym końcu tabeli**, zarówno przy sortowaniu rosnącym (`asc`), jak i malejącym (`desc`).
   - Sortowanie liczb odbywa się matematycznie (nie alfabetycznie), dat – według czasu uniksowego (epoch ms), a tekstu – za pomocą `Intl.Collator` dla języka polskiego.
   - Sortowanie nigdy nie mutuje tablicy źródłowej (`[...rows].sort(...)`). W przypadku remisu zachowywana jest kolejność pierwotna (`sourceIndex`).

8. **Obsługa stanów aplikacji (R17):**
   - **Loading:** czytelny wskaźnik ładowania z atrybutem `role="status"`.
   - **Error:** komunikat błędu z przyciskiem ponowienia ("Spróbuj ponownie") bez przeładowywania strony i z zabezpieczeniem przed wyścigami asynchronicznymi (`AbortController`).
   - **Source-empty:** gdy baza danych nie zwraca żadnych wierszy ("Brak wniosków w systemie").
   - **Filtered-empty:** gdy filtry nie dają wyników ("Brak wyników spełniających kryteria" z przyciskiem "Wyczyść filtry").

9. **Paginacja po filtrowaniu i sortowaniu:**
   - Przy 1 200 rekordach pierwsza wersja renderowała wszystkie wiersze. Profilowanie w Chrome pokazało reprezentatywny czas renderu `DataTable` około 143 ms.
   - Prosta paginacja po 50 wierszy obniżyła obserwowany czas reprezentatywnego renderu do około 27 ms. Są to pomiary lokalne, a nie gwarantowany benchmark.
   - Operacje zachowują kolejność: pełny zbiór → filtrowanie → sortowanie → `slice` dla bieżącej strony. Dzięki temu wyniki na stronach są globalnie poprawne.

10. **Stan widoku w URL:**
   - Wyszukiwanie, status, sortowanie i strona są zapisywane w parametrach `q`, `status`, `sort`, `dir` i `page`.
   - Nieobsługiwane wartości statusu i sortowania są odrzucane na podstawie aktualnych metadanych, a numer strony jest bezpiecznie ograniczany do dostępnego zakresu.

---

## 4. Zasady programowania zastosowane w projekcie (z przykładami w kodzie)

1. **Single Responsibility Principle (SRP):**
   - `src/services/tableRepository.ts`: odpowiada wyłącznie za komunikację sieciową i walidację transportu JSON.
   - `src/services/tableAdapter.ts`: odpowiada za normalizację kontraktu danych, uzupełnienie brakujących pól i adaptację uprawnień.
   - `src/logic/tableLogic.ts`: czysta warstwa kalkulacyjna (brak zależności od Reacta i DOM), realizująca algorytmy filtrowania i sortowania.
   - `src/components/DataTable/DataTable.tsx`: komponent czysto prezentacyjny i koordynujący interakcję użytkownika z metadanymi.

2. **Czyste funkcje i niemutowalność (Pure Functions & Immutability):**
   - Funkcje `filterRows` i `sortRows` w `src/logic/tableLogic.ts` są całkowicie czyste i deterministyczne. Nigdy nie mutują przekazanej tablicy źródłowej:
   ```ts
   // Przykład z src/logic/tableLogic.ts:
   export function sortRows(rows: readonly TableRow[], ...): TableRow[] {
     if (!sortState) return [...rows];
     return [...rows].sort((a, b) => { ... });
   }
   ```
   Dzięki temu dane filtrowane i sortowane w komponencie React są danymi pochodnymi (`useMemo`), eliminując błędy desynchronizacji stanu.

3. **Granica danych / adapter:**
   - Tabela `DataTable` nie posiada ani jednej linii kodu związanej z pojęciem "kredytu", "wniosku" czy zagnieżdżonego obiektu `permissions`. Adapter przekształca dane specyficzne dla domeny w uniwersalny słownik komórek `values: Record<string, CellValue>`.

4. **Fail-Closed & Defensive Programming:**
   - W przypadku braku informacji o uprawnieniach akcja jest domyślnie blokowana:
   ```ts
   // Przykład z src/services/tableAdapter.ts:
    const canEdit = row.permissions?.canEdit === true;
   ```
   - Komórka akcji renderuje rzeczywisty atrybut HTML `disabled`:
   ```tsx
   // Przykład z src/components/DataTable/ActionButton.tsx:
   <button type="button" disabled={!enabled} ... />
   ```

---

## 5. Pokrycie testami automatycznymi (R18)

Projekt zawiera 5 plików testowych i 44 testy jednostkowe oraz integracyjne:

1. `tests/tableLogic.test.ts` (13 testów):
   - Wyszukiwanie tekstu bez względu na wielkość liter i polskie znaki diakrytyczne ("ł", "ź", itp.).
   - Dokładne filtrowanie po statusie.
   - Łączenie filtrów z logiką `AND`.
   - Sortowanie liczb, walut, dat i tekstu z polską kolacją.
   - Zasada umieszczania brakujących wartości na końcu w obu kierunkach (`asc` i `desc`).
   - Niemutowalność tablicy wejściowej.
   - Cykl sortowania nagłówków: brak sortowania → rosnąco → malejąco → brak sortowania.

2. `tests/tableAdapter.test.ts` (4 testy):
   - Przestrzeganie kolejności `order` i domyślna kolejność `sourceIndex`.
   - Ukrywanie kolumn z `visible: false`.
   - Rzucanie błędów przy niepoprawnych metadanych kolumn.
   - Normalizacja `permissions.canEdit` do `values.canEdit` z zasadą fail-closed.
   - Deterministyczna obsługa brakujących i zduplikowanych identyfikatorów wierszy.

3. `tests/DataTable.test.tsx` (12 testów integracyjnych RTL):
   - Renderowanie kolumn wyłącznie na podstawie metadanych.
   - Poprawne renderowanie aktywnych i wyłączonych przycisków akcji oraz wywoływanie callbacku `onAction`.
   - Dostępne nagłówki kolumn z aktualizacją `aria-sort`.
   - Interaktywne filtrowanie przez wyszukiwarkę i obsługa stanu braku wyników.
   - Paginacja wierszy, nawigacja między stronami oraz reset do 1. strony po zmianie filtrów.
   - Alternatywny klucz kolumny statusu, odrzucanie błędnych parametrów URL i renderowanie braków jako `—`.

4. `tests/App.test.tsx` (5 testów integracyjnych stanów aplikacji i cyklu życia):
   - Wyświetlenie stanu ładowania, a następnie sukcesu z danymi.
   - Wyświetlenie stanu braku danych w systemie (`source-empty`).
   - Obsługa błędu pobierania z przyciskiem ponowienia ("Spróbuj ponownie") i pomyślne odzyskanie danych.
   - Anulowanie żądań w locie przy odmontowaniu (`AbortController`) zapobiegające wyciekom pamięci i wyścigom asynchronicznym.
   - Obsługa powiadomienia o wykonaniu akcji (toast) z możliwością manualnego zamknięcia.

5. `tests/useTableUrlSync.test.ts` (10 testów):
   - Odczyt i zapis parametrów URL, wartości domyślne oraz obsługa `popstate`.

---

## 6. Co zrobił(a)bym dalej przy dodatkowych 60–90 minutach (R22)

Gdyby zadanie miało być rozwijane w kolejnym etapie, priorytetami byłyby:

1. **Test E2E krytycznej ścieżki:**
   - Jeden scenariusz w prawdziwej przeglądarce obejmujący filtrowanie, sortowanie, zmianę strony i akcję wiersza oraz osobny scenariusz błędu z retry.

2. **Dokładniejsza walidacja granicy danych:**
   - Jeżeli lokalne fixture'y zostałyby zastąpione zewnętrznym API, rozszerzyłbym walidację pól DTO i raportowanie błędów kontraktu.

3. **Dodatkowa weryfikacja dostępności:**
   - Automatyczny audyt podstawowych reguł oraz ręczny test klawiaturą i czytnikiem ekranu dla sortowania, filtrów i paginacji.
