export interface Honoree {
  name: string;
  branch?: string;
  rank?: string;
  birthYear?: number;
  deathYear?: number;
  conflictEra?: string;

  // Florida CSV demographic fields
  age?: number;
  tour?: number; // years of service
  causeOfDeath?: string;
  incidentDescription?: string;
  summary?: string; // biographical summary
  education?: string;
  placeOfBirth?: string;
  placeOfDeath?: string;
  gender?: string;
  involvedInSports?: boolean;
  involvedInPolitics?: boolean;
  involvedInMilitary?: boolean;
  involvedInMusic?: boolean;
}

export interface Location {
  coordinates: [number, number][] | [number, number]; // polyline or point
  county?: string;
  city?: string;
  state: string;
}

export interface Designation {
  year: number;
  legislation?: string;
}

export interface Highway {
  id: string;
  shapeId: string; // ArcGIS Shape ID
  name: string;
  state: string;
  honoree: Honoree;
  location: Location;
  designation: Designation;
  description?: string;

  // Florida CSV additional fields
  county: string;
  bill?: string;
}

export interface HighwayDataset {
  highways: Highway[];
  metadata: {
    lastUpdated: string;
    totalCount: number;
    states: string[];
  };
}

export interface AnalysisData {
  demographics: {
    byBranch: Record<string, number>;
    byState: Record<string, number>;
    byDecade: Record<string, number>;
    byConflict: Record<string, number>;
    byCounty?: Record<string, number>; // Florida county breakdown
    byGender?: Record<string, number>;
    byInvolvement?: Record<string, number>;
  };
  findings: Array<{
    id: string;
    title: string;
    description: string;
    visualizationType: "chart" | "map" | "table";
    data: any;
    imageUrl?: string; // For static visualization images
  }>;
}
