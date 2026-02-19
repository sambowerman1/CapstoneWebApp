/**
 * Shared analysis.json generator.
 */

interface HighwayForAnalysis {
  county: string;
  state: string;
  designation: { year?: number };
  honoree: {
    gender?: string;
    involvedInMilitary?: boolean;
    involvedInPolitics?: boolean;
    involvedInLawEnforcement?: boolean;
    involvedInFireService?: boolean;
    involvedInSports?: boolean;
    involvedInMusic?: boolean;
  };
}

export function generateAnalysisData(highways: HighwayForAnalysis[], stateCode: string, stateName: string) {
  const byCounty: Record<string, number> = {};
  const byDecade: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  const byInvolvement: Record<string, number> = {
    'Military': 0,
    'Politics': 0,
    'Law Enforcement': 0,
    'Fire Service': 0,
    'Sports': 0,
    'Music': 0,
  };

  highways.forEach(hw => {
    // County
    const county = hw.county.replace(' (Multi-County)', '');
    if (county !== 'Unknown' && county) {
      if (county.includes(',')) {
        county.split(',').forEach(c => {
          const trimmed = c.trim();
          byCounty[trimmed] = (byCounty[trimmed] || 0) + 1;
        });
      } else {
        byCounty[county] = (byCounty[county] || 0) + 1;
      }
    }

    // Decade
    if (hw.designation.year) {
      const decade = `${Math.floor(hw.designation.year / 10) * 10}s`;
      byDecade[decade] = (byDecade[decade] || 0) + 1;
    }

    // Gender
    if (hw.honoree.gender) {
      const g = hw.honoree.gender.charAt(0).toUpperCase() + hw.honoree.gender.slice(1).toLowerCase();
      byGender[g] = (byGender[g] || 0) + 1;
    }

    // Involvement
    if (hw.honoree.involvedInMilitary) byInvolvement['Military']++;
    if (hw.honoree.involvedInPolitics) byInvolvement['Politics']++;
    if (hw.honoree.involvedInLawEnforcement) byInvolvement['Law Enforcement']++;
    if (hw.honoree.involvedInFireService) byInvolvement['Fire Service']++;
    if (hw.honoree.involvedInSports) byInvolvement['Sports']++;
    if (hw.honoree.involvedInMusic) byInvolvement['Music']++;
  });

  // Remove zero-count involvement categories
  Object.keys(byInvolvement).forEach(key => {
    if (byInvolvement[key] === 0) delete byInvolvement[key];
  });

  return {
    demographics: {
      byBranch: {},
      byState: { [stateCode]: highways.length },
      byDecade,
      byConflict: {},
      byCounty,
      byGender,
      byInvolvement,
    },
    findings: [
      {
        id: `finding-${stateCode.toLowerCase()}-counties`,
        title: `${stateName} County Distribution`,
        description: `Memorial highways are distributed across ${Object.keys(byCounty).length} ${stateName} counties.`,
        visualizationType: 'map',
        data: byCounty,
      },
      {
        id: `finding-${stateCode.toLowerCase()}-involvement`,
        title: 'Honoree Background Categories',
        description: `${stateName} memorial highway honorees by category of involvement.`,
        visualizationType: 'chart',
        data: byInvolvement,
      },
    ],
  };
}
