# Memorial Highways Web Application - Project Context

## Project Overview

This is a **Capstone Project** web application that consolidates memorial highway data from across the United States. Currently, each state maintains its own database of memorial highways independently - this project aims to create a comprehensive national database with demographic analysis.

**Purpose:** Analyze patterns in memorial highway designations (e.g., why some people get memorialized, geographic factors, demographic trends).

## Tech Stack

- **Framework:** Next.js 14 with TypeScript (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Mapping:** Leaflet + esri-leaflet (for ArcGIS ShapeID data)
- **Data Tables:** TanStack Table (React Table v8)
- **Data Storage:** Static JSON files in `public/data/`
- **Deployment Target:** Vercel

## Project Structure

```
CapstoneWebApp/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with Header/Footer
│   │   ├── page.tsx                  # Landing page (hero, features, stats)
│   │   ├── about/page.tsx            # About page (mission, methodology)
│   │   ├── map/page.tsx              # Interactive map page
│   │   ├── findings/page.tsx         # Analysis & data table page
│   │   └── globals.css               # Global styles + Tailwind + shadcn theme
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx            # Navigation header (responsive)
│   │   │   └── Footer.tsx            # Footer with links
│   │   ├── map/
│   │   │   ├── MapContainer.tsx      # Wrapper with dynamic import (SSR: false)
│   │   │   ├── HighwayMap.tsx        # Leaflet map implementation
│   │   │   └── MapControls.tsx       # Filter controls (state, search, branch)
│   │   ├── findings/
│   │   │   ├── DataTable.tsx         # TanStack Table with sorting/filtering
│   │   │   └── StatisticsCards.tsx   # Statistics summary cards
│   │   └── ui/                       # shadcn/ui components (auto-generated)
│   │
│   ├── lib/
│   │   ├── utils.ts                  # cn() utility for Tailwind classes
│   │   └── data-loader.ts            # Data fetching & filtering utilities
│   │
│   └── types/
│       └── highway.ts                # TypeScript interfaces for data models
│
├── public/
│   ├── data/
│   │   ├── highways.json             # Memorial highway data (sample + real)
│   │   └── analysis.json             # Demographic analysis results
│   └── leaflet/                      # Leaflet marker icon images
│
├── components.json                   # shadcn/ui configuration
├── tailwind.config.ts                # Tailwind + shadcn theme config
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

## Key Files & Their Purpose

### Data Models (`src/types/highway.ts`)
Defines TypeScript interfaces for:
- `Highway` - Main data structure for memorial highways
- `Honoree` - Information about the person being honored
- `Location` - Geographic data (coordinates, county, state)
- `Designation` - When/how the highway was designated
- `HighwayDataset` - Complete dataset with metadata
- `AnalysisData` - Demographics and findings

**Important:** All coordinates support both single points `[lat, lng]` and polylines `[[lat, lng], ...]`

### Data Loading (`src/lib/data-loader.ts`)
- `loadHighwayData()` - Fetches highways.json
- `loadAnalysisData()` - Fetches analysis.json
- Filter utilities for state, search, and branch

### Map Components
**Critical architectural decision:** Leaflet requires browser APIs (window, document), so the map component MUST use dynamic import with `ssr: false`:

```typescript
const HighwayMap = dynamic(() => import("./HighwayMap"), {
  ssr: false,  // IMPORTANT: Prevents server-side rendering
  loading: () => <MapSkeleton />,
})
```

**ArcGIS Integration:** The `esri-leaflet` library is installed to handle ArcGIS-derived data (ShapeID properties). Currently using standard Leaflet, but esri-leaflet is available for advanced ArcGIS feature layer support.

## Data Format

### highways.json Structure
```json
{
  "highways": [
    {
      "id": "unique-id",
      "shapeId": "ARCGIS_SHAPE_ID",
      "name": "Highway Name",
      "state": "CA",
      "honoree": {
        "name": "Person Name",
        "branch": "Army",
        "rank": "Sergeant",
        "birthYear": 1982,
        "deathYear": 2009,
        "conflictEra": "Iraq War"
      },
      "location": {
        "coordinates": [[lat, lng], ...] | [lat, lng],
        "county": "County Name",
        "city": "City Name",
        "state": "CA"
      },
      "designation": {
        "year": 2010,
        "legislation": "Bill number"
      },
      "description": "Optional description"
    }
  ],
  "metadata": {
    "lastUpdated": "2026-01-21T00:00:00Z",
    "totalCount": 6,
    "states": ["CA", "TX", "NY", ...]
  }
}
```

### analysis.json Structure
```json
{
  "demographics": {
    "byBranch": { "Army": 4, "Navy": 1, ... },
    "byState": { "CA": 1, "TX": 1, ... },
    "byDecade": { "2000s": 2, "2010s": 4 },
    "byConflict": { "Iraq War": 3, ... }
  },
  "findings": [
    {
      "id": "finding-001",
      "title": "Finding title",
      "description": "Finding description",
      "visualizationType": "chart" | "map" | "table",
      "data": null
    }
  ]
}
```

## Running the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Opens at http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

## Current State

**Status:** ✅ Fully functional MVP complete

**Sample Data:** The app currently has 6 sample memorial highways representing different states and branches. This is for demonstration purposes.

**Pages:**
- ✅ Landing page with hero, features, and statistics
- ✅ About page explaining the project
- ✅ Interactive map with filters (state, search, branch)
- ✅ Findings page with data table and statistics cards

**Features Working:**
- Responsive navigation (mobile menu)
- Interactive Leaflet map with markers/polylines
- Map filtering (state, honoree name search, military branch)
- Data table with sorting, pagination, and global search
- Statistics cards showing demographic breakdowns
- Fully responsive design (mobile, tablet, desktop)

## Important Architectural Decisions

1. **Static Data Over Database:** Using static JSON files instead of a database because:
   - Data is relatively static (read-only for users)
   - Fast CDN delivery via Vercel
   - Easy to version control
   - Simplifies deployment

2. **Client-Side Map Rendering:** Leaflet map is client-side only (`ssr: false`) because it requires browser APIs

3. **App Router:** Using Next.js 14 App Router for:
   - Better performance with Server Components
   - Built-in layouts
   - File-based routing

4. **TypeScript:** Strict typing for all data structures to prevent errors when working with complex highway data

## Next Steps / TODO

### High Priority
- [ ] Replace sample data in `public/data/highways.json` with real memorial highway data
- [ ] Update `public/data/analysis.json` with actual demographic analysis
- [ ] Create data processing script to transform ArcGIS exports (see plan file for details)
- [ ] Test with full dataset to ensure map performance (may need marker clustering)

### Medium Priority
- [ ] Add data export functionality (CSV/JSON download)
- [ ] Implement advanced filtering (multi-select states, date ranges)
- [ ] Add charts/visualizations to Findings page (using recharts)
- [ ] SEO optimization (meta tags, sitemap, Open Graph tags)
- [ ] Add loading states and error handling throughout

### Low Priority / Future Enhancements
- [ ] Progressive Web App (PWA) capabilities
- [ ] Dark mode toggle
- [ ] Social sharing features
- [ ] Admin interface for data entry/updates
- [ ] API development for external data access
- [ ] Performance optimization with marker clustering for 1000+ highways

## Data Collection Notes

**ArcGIS Integration:**
- Data includes `shapeId` field for ArcGIS compatibility
- `esri-leaflet` library is installed and ready to use
- Can load ArcGIS feature layers directly if needed

**Data Sources:**
- State Department of Transportation websites
- Legislative records
- ArcGIS databases

**Data Processing:**
A data processing script is planned in `scripts/process-data.js` to:
1. Read ArcGIS CSV/JSON exports
2. Transform to the Highway interface format
3. Handle ShapeID mapping
4. Parse coordinates correctly
5. Generate analysis.json from aggregated data

See `/Users/sambowerman/.claude/plans/mellow-sniffing-cake.md` for detailed implementation plan.

## Deployment

**Target:** Vercel (free tier)

**Steps:**
1. Push to GitHub
2. Import repository to Vercel
3. Vercel auto-detects Next.js and configures build
4. Deploy!

**Environment Variables:**
```bash
# .env.local (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production (set in Vercel dashboard)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## Common Issues & Solutions

### Issue: Leaflet map not loading
**Solution:** Ensure dynamic import with `ssr: false` is used and Leaflet CSS is imported

### Issue: Marker icons missing
**Solution:** Icons are in `public/leaflet/` and configured in `HighwayMap.tsx`

### Issue: Type errors with Highway data
**Solution:** Check data structure matches interfaces in `src/types/highway.ts`

### Issue: Build fails
**Solution:** Run `npm install` to ensure all dependencies are installed, especially `tailwindcss-animate`

## Performance Considerations

**Current:** Optimized for ~100 highways
**Future:** If dataset grows to 1000+ highways, implement:
- Leaflet marker clustering (`leaflet.markercluster`)
- Canvas renderer instead of SVG
- Lazy loading data by map viewport
- Virtual scrolling for data table

## Contact & Resources

- **Plan File:** `/Users/sambowerman/.claude/plans/mellow-sniffing-cake.md`
- **Documentation:** This file (claude.md)
- **Deployment Guide:** See plan file Phase 10

---

**Last Updated:** January 21, 2026
**Version:** 1.0.0 (MVP Complete)
**Status:** Ready for real data integration
