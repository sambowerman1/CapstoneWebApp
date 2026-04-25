#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(stringr)
  library(purrr)
  library(tidyr)
  library(jsonlite)
  library(lubridate)
})

state_name_to_code <- c(
  "Alabama" = "AL", "Alaska" = "AK", "Arizona" = "AZ", "Arkansas" = "AR", "California" = "CA",
  "Colorado" = "CO", "Connecticut" = "CT", "Delaware" = "DE", "Florida" = "FL", "Georgia" = "GA",
  "Hawaii" = "HI", "Idaho" = "ID", "Illinois" = "IL", "Indiana" = "IN", "Iowa" = "IA",
  "Kansas" = "KS", "Kentucky" = "KY", "Louisiana" = "LA", "Maine" = "ME", "Maryland" = "MD",
  "Massachusetts" = "MA", "Michigan" = "MI", "Minnesota" = "MN", "Mississippi" = "MS", "Missouri" = "MO",
  "Montana" = "MT", "Nebraska" = "NE", "Nevada" = "NV", "New Hampshire" = "NH", "New Jersey" = "NJ",
  "New Mexico" = "NM", "New York" = "NY", "North Carolina" = "NC", "North Dakota" = "ND", "Ohio" = "OH",
  "Oklahoma" = "OK", "Oregon" = "OR", "Pennsylvania" = "PA", "Rhode Island" = "RI", "South Carolina" = "SC",
  "South Dakota" = "SD", "Tennessee" = "TN", "Texas" = "TX", "Utah" = "UT", "Vermont" = "VT",
  "Virginia" = "VA", "Washington" = "WA", "West Virginia" = "WV", "Wisconsin" = "WI", "Wyoming" = "WY",
  "District of Columbia" = "DC"
)

abbr2state <- setNames(names(state_name_to_code), state_name_to_code)

app_root <- normalizePath(getwd(), mustWork = FALSE)
capstone_root <- normalizePath(file.path(app_root, ".."), mustWork = FALSE)
shiny_dir <- file.path(capstone_root, "EDA", "rshiny-capstone")
openclaw_hw <- file.path(capstone_root, "openclaw", "all_states_summarized.csv")
fallback_hw <- file.path(shiny_dir, "all_states_summarized.csv")
hw_path <- if (file.exists(openclaw_hw)) openclaw_hw else fallback_hw

must_exist <- c(
  hw_path,
  file.path(shiny_dir, "us_states_demographics.csv"),
  file.path(shiny_dir, "us_counties_demographics.csv"),
  file.path(shiny_dir, "2024_US_County_Level_Presidential_Results.csv"),
  file.path(shiny_dir, "2020_US_County_Level_Presidential_Results.csv"),
  file.path(shiny_dir, "2016_US_County_Level_Presidential_Results.csv")
)

missing <- must_exist[!file.exists(must_exist)]
if (length(missing) > 0) {
  stop(paste("Missing required files:\n", paste(missing, collapse = "\n")))
}

hw_raw <- read_csv(hw_path, show_col_types = FALSE)
states_demo <- read_csv(file.path(shiny_dir, "us_states_demographics.csv"), show_col_types = FALSE)
co_demo <- read_csv(file.path(shiny_dir, "us_counties_demographics.csv"), show_col_types = FALSE)
elec24 <- read_csv(file.path(shiny_dir, "2024_US_County_Level_Presidential_Results.csv"), show_col_types = FALSE)
elec20 <- read_csv(file.path(shiny_dir, "2020_US_County_Level_Presidential_Results.csv"), show_col_types = FALSE)
elec16 <- read_csv(file.path(shiny_dir, "2016_US_County_Level_Presidential_Results.csv"), show_col_types = FALSE)

safe_num <- function(x) ifelse(is.na(x), 0, x)

fl_valid_counties <- hw_raw %>%
  filter(state == "Florida", !is.na(county),
         !county %in% c("Multiple Counties", "Miami\u2010Dade", "Flager")) %>%
  pull(county) %>%
  unique()

fl_avg <- co_demo %>%
  filter(str_detect(County, "Florida")) %>%
  mutate(county_clean = str_remove(County, " County, Florida")) %>%
  filter(county_clean %in% fl_valid_counties) %>%
  summarise(across(c(Median_Age, Median_Household_Income, Unemployment_Rate,
                     Pct_Below_Poverty_Level, Pct_White_Alone, Pct_Black_Alone,
                     Pct_Hispanic, Pct_Asian_Alone, Pct_AIAN_Alone, Pct_TwoOrMore),
                   ~mean(.x, na.rm = TRUE))) %>%
  mutate(State = "Florida")

demo_cols <- c("State", "Median_Age", "Median_Household_Income", "Unemployment_Rate",
               "Pct_Below_Poverty_Level", "Pct_White_Alone", "Pct_Black_Alone",
               "Pct_Hispanic", "Pct_Asian_Alone", "Pct_AIAN_Alone", "Pct_TwoOrMore",
               "HS_Grad_or_Higher", "Bachelors_or_Higher")

state_demo <- states_demo %>%
  select(any_of(demo_cols)) %>%
  filter(State != "Florida") %>%
  bind_rows(fl_avg %>% select(any_of(demo_cols)))

agg_elec <- function(df, col) {
  df %>%
    group_by(state_name = .data[[col]]) %>%
    summarise(vd = sum(votes_dem, na.rm = TRUE),
              vg = sum(votes_gop, na.rm = TRUE),
              vt = sum(total_votes, na.rm = TRUE), .groups = "drop") %>%
    mutate(per_dem = vd / vt, per_gop = vg / vt, margin_gop = (per_gop - per_dem) * 100)
}

s24 <- agg_elec(elec24, "state_name")
s20 <- agg_elec(elec20, "state_name")
s16 <- elec16 %>%
  group_by(state_abbr) %>%
  summarise(vd = sum(votes_dem, na.rm = TRUE), vg = sum(votes_gop, na.rm = TRUE),
            vt = sum(total_votes, na.rm = TRUE), .groups = "drop") %>%
  mutate(state_name = abbr2state[state_abbr],
         per_dem = vd / vt, per_gop = vg / vt, margin_gop = (per_gop - per_dem) * 100) %>%
  filter(!is.na(state_name))

hw_counts <- hw_raw %>% count(state, name = "highways")

master <- hw_counts %>%
  left_join(s24 %>% select(state_name, m24 = margin_gop, d24 = per_dem, g24 = per_gop), by = c("state" = "state_name")) %>%
  left_join(s20 %>% select(state_name, m20 = margin_gop), by = c("state" = "state_name")) %>%
  left_join(s16 %>% select(state_name, m16 = margin_gop), by = c("state" = "state_name")) %>%
  left_join(state_demo, by = c("state" = "State")) %>%
  mutate(
    swing_20_24 = m24 - m20,
    winner24 = if_else(m24 > 0, "GOP", "DEM"),
    stateCode = state_name_to_code[state]
  )

state_profiles <- hw_raw %>%
  group_by(state) %>%
  summarise(
    highways = n(),
    has_wiki = sum(!is.na(wikipedia_url)),
    male = sum(gender == "male", na.rm = TRUE),
    female = sum(gender == "female", na.rm = TRUE),
    military = sum(involved_in_military == "yes", na.rm = TRUE),
    politics = sum(involved_in_politics == "yes", na.rm = TRUE),
    sports = sum(involved_in_sports == "yes", na.rm = TRUE),
    music = sum(involved_in_music == "yes", na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(wiki_pct = has_wiki / highways, stateCode = state_name_to_code[state])

eras <- hw_raw %>%
  mutate(
    dob_year = as.integer(str_extract(dob, "\\d{4}")),
    dod_year = as.integer(str_extract(dod, "\\d{4}")),
    lifespan = dod_year - dob_year,
    birth_dec = (dob_year %/% 10) * 10,
    death_dec = (dod_year %/% 10) * 10
  )

us_state_names <- names(state_name_to_code)[names(state_name_to_code) != "District of Columbia"]
extract_state <- function(x) {
  if (is.na(x) || x == "not found") return(NA_character_)
  str_extract(x, paste(us_state_names, collapse = "|"))
}

geo <- hw_raw %>%
  mutate(
    birth_state = map_chr(place_of_birth, extract_state),
    death_state = map_chr(place_of_death, extract_state)
  )

stopwords <- c(
  "highway", "memorial", "route", "road", "bridge", "avenue", "boulevard", "dr", "drive",
  "street", "freeway", "parkway", "expressway", "corridor", "the", "of", "and", "to", "at",
  "for", "in", "a", "an", "sr", "us", "state", "interstate", "hwy", "blvd", "ave", "iii", "ii", "jr"
)

word_freq <- hw_raw %>%
  filter(!is.na(highway_name)) %>%
  mutate(words = str_extract_all(str_to_lower(highway_name), "[a-z']+")) %>%
  unnest(words) %>%
  filter(!words %in% stopwords, str_length(words) > 2) %>%
  count(words, sort = TRUE)

parse_tour_years <- function(x) {
  x <- as.character(x)
  ifelse(
    is.na(x) | x == "Not available", NA_real_, {
      yrs_m <- suppressWarnings(as.numeric(str_match(x, "(\\d+)\\s*year")[, 2]))
      mos_m <- suppressWarnings(as.numeric(str_match(x, "(\\d+)\\s*month")[, 2]))
      yrs_val <- ifelse(is.na(yrs_m), 0, yrs_m)
      mos_val <- ifelse(is.na(mos_m), 0, mos_m / 12)
      result <- yrs_val + mos_val
      ifelse(result == 0, NA_real_, round(result, 2))
    }
  )
}

group_cause <- function(x) {
  x <- str_to_lower(as.character(x))
  case_when(
    str_detect(x, "gunfire") ~ "Gunfire",
    str_detect(x, "automobile|vehicle pursuit|motorcycle") ~ "Vehicle crash",
    str_detect(x, "vehicular assault|struck by vehicle") ~ "Struck by vehicle",
    str_detect(x, "aircraft") ~ "Aircraft",
    str_detect(x, "assault|stab|bomb") ~ "Assault (other)",
    TRUE ~ "Other / illness"
  )
}

odmp <- hw_raw %>%
  filter(!is.na(odmp_url)) %>%
  mutate(
    age_num = as.numeric(ifelse(odmp_age == "Not available" | is.na(odmp_age), NA, odmp_age)),
    tour_years = parse_tour_years(odmp_tour),
    eow_date = mdy(odmp_end_of_watch),
    eow_year = year(eow_date),
    eow_month = month(eow_date, label = TRUE, abbr = TRUE),
    eow_decade = (eow_year %/% 10) * 10,
    cause_grp = group_cause(odmp_cause),
    weapon = case_when(
      str_detect(odmp_incident_details, regex("firearm|gun|shot|handgun|rifle|pistol", ignore_case = TRUE)) ~ "Firearm",
      str_detect(odmp_incident_details, regex("automobile|vehicle|car|truck", ignore_case = TRUE)) ~ "Vehicle",
      str_detect(odmp_incident_details, regex("knife|stab|blade", ignore_case = TRUE)) ~ "Knife/blade",
      str_detect(odmp_incident_details, regex("aircraft|plane|helicopter", ignore_case = TRUE)) ~ "Aircraft",
      TRUE ~ "Other/unknown"
    ),
    match_quality = cut(odmp_fuzzy_score,
                        breaks = c(0, 70, 80, 90, 100),
                        labels = c("Low (<70)", "Medium (70–79)", "High (80–89)", "Exact (90+)"),
                        include.lowest = TRUE)
  )

odmp_state_rate <- hw_raw %>%
  group_by(state) %>%
  summarise(total_hw = n(), odmp_n = sum(!is.na(odmp_url)), .groups = "drop") %>%
  filter(odmp_n > 0) %>%
  mutate(
    match_rate = odmp_n / total_hw,
    avg_age = map_dbl(state, ~mean(odmp$age_num[odmp$state == .x], na.rm = TRUE)),
    avg_tour = map_dbl(state, ~mean(odmp$tour_years[odmp$state == .x], na.rm = TRUE)),
    pct_gunfire = map_dbl(state, ~mean(odmp$cause_grp[odmp$state == .x] == "Gunfire", na.rm = TRUE) * 100)
  )

incident_words <- odmp %>%
  filter(!is.na(odmp_incident_details)) %>%
  mutate(words = str_extract_all(str_to_lower(odmp_incident_details), "[a-z]+")) %>%
  unnest(words) %>%
  filter(!words %in% c("cause", "incident", "date", "weapon", "offender", "and", "the",
                       "of", "in", "a", "an", "by", "was", "on", "at", "to", "is", "he", "she",
                       "his", "her", "while", "had", "been", "shot", "killed", "not")) %>%
  count(words, sort = TRUE)

make_points <- function(df, x_col, y_col, extra_cols = NULL) {
  cols <- c(x_col, y_col, extra_cols)
  out <- df %>%
    select(any_of(cols)) %>%
    filter(!is.na(.data[[x_col]]), !is.na(.data[[y_col]]))
  records <- apply(out, 1, as.list)
  lapply(records, function(x) x)
}

chart_component <- function(id, title, chartType, data, xKey = NULL, yKey = NULL, series = NULL, filterId = NULL, variants = NULL, subtitle = NULL) {
  component <- list(
    id = id,
    type = "chart",
    title = title,
    chartType = chartType,
    data = data
  )
  if (!is.null(xKey)) component$xKey <- xKey
  if (!is.null(yKey)) component$yKey <- yKey
  if (!is.null(series)) component$series <- series
  if (!is.null(filterId)) component$filterId <- filterId
  if (!is.null(variants)) component$variants <- variants
  if (!is.null(subtitle)) component$subtitle <- subtitle
  component
}

table_component <- function(id, title, rows) {
  list(
    id = id,
    type = "table",
    title = title,
    columns = names(rows),
    rows = apply(rows, 1, as.list)
  )
}

metric_component <- function(id, title, value, description = NULL) {
  metric <- list(id = id, type = "metric", title = title, value = as.character(value))
  if (!is.null(description)) metric$description <- description
  metric
}

map_var_options <- list(
  list(label = "Highway count", value = "highways"),
  list(label = "Median income", value = "Median_Household_Income"),
  list(label = "Poverty rate", value = "Pct_Below_Poverty_Level"),
  list(label = "Median age", value = "Median_Age"),
  list(label = "GOP margin 2024", value = "m24")
)

econ_var_options <- list(
  list(label = "Median household income", value = "Median_Household_Income"),
  list(label = "% below poverty line", value = "Pct_Below_Poverty_Level"),
  list(label = "Unemployment rate (%)", value = "Unemployment_Rate"),
  list(label = "Median age (years)", value = "Median_Age"),
  list(label = "HS grad or higher", value = "HS_Grad_or_Higher"),
  list(label = "Bachelor's or higher", value = "Bachelors_or_Higher")
)

race_var_options <- list(
  list(label = "% AIAN alone", value = "Pct_AIAN_Alone"),
  list(label = "% White alone", value = "Pct_White_Alone"),
  list(label = "% Black alone", value = "Pct_Black_Alone"),
  list(label = "% Hispanic", value = "Pct_Hispanic"),
  list(label = "% Asian alone", value = "Pct_Asian_Alone"),
  list(label = "% Two or more races", value = "Pct_TwoOrMore")
)

odmp_cause_options <- list(
  list(label = "All causes", value = "all"),
  list(label = "Gunfire", value = "Gunfire"),
  list(label = "Vehicle crash", value = "Vehicle crash"),
  list(label = "Struck by vehicle", value = "Struck by vehicle"),
  list(label = "Aircraft", value = "Aircraft"),
  list(label = "Assault (other)", value = "Assault (other)"),
  list(label = "Other / illness", value = "Other / illness")
)

components <- list()
add_component <- function(component) components[[component$id]] <<- component

# Overview
add_component(metric_component("vb_total", "Total highways", nrow(hw_raw)))
add_component(metric_component("vb_states", "States covered", n_distinct(hw_raw$state)))
add_component(metric_component("vb_verified", "Verified gender", 247))
add_component(metric_component("vb_mlk", "MLK Jr. highways", 35))
add_component(metric_component("vb_military", "Military honorees", 95))
add_component(metric_component("vb_political", "Political honorees", 167))
add_component(metric_component("vb_gop_avg", "Avg highways — GOP states", 204))
add_component(metric_component("vb_dem_avg", "Avg highways — DEM states", 81))

p_top15 <- master %>%
  arrange(desc(highways)) %>%
  head(15) %>%
  transmute(state, highways, winner24, stateCode = state_name_to_code[state])
add_component(chart_component("p_top15", "Top 15 states by highway count", "bar", apply(p_top15, 1, as.list), "state", "highways", c("winner24")))

p_dist <- master %>%
  mutate(bucket = cut(highways, breaks = c(0, 10, 50, 150, 500, Inf),
                      labels = c("1-10", "11-50", "51-150", "151-500", "500+"), right = TRUE)) %>%
  count(bucket, name = "count") %>%
  mutate(bucket = as.character(bucket))
add_component(chart_component("p_dist", "Highway count distribution", "bar", apply(p_dist, 1, as.list), "bucket", "count"))

# Geography map variants
map_variants <- list()
for (opt in map_var_options) {
  v <- opt$value
  map_df <- master %>%
    transmute(state, stateCode, value = .data[[v]], highways, winner24) %>%
    filter(!is.na(stateCode))
  map_variants[[v]] <- apply(map_df, 1, as.list)
}
add_component(chart_component(
  "p_map", "US choropleth map", "mapPseudo",
  map_variants$highways, xKey = "stateCode", yKey = "value",
  filterId = "map_var", variants = map_variants,
  subtitle = "Rendered as state bars in web app; values follow Shiny map variable selections."
))

# Honorees
p_gender <- hw_raw %>%
  filter(gender %in% c("male", "female")) %>%
  count(gender, name = "count")
add_component(chart_component("p_gender", "Gender breakdown", "pie", apply(p_gender, 1, as.list), "gender", "count"))

p_bg <- tibble(category = c("Neither", "Political", "Military", "Sports", "Music"),
               count = c(1341, 167, 95, 20, 8))
add_component(chart_component("p_bg", "Background categories", "pie", apply(p_bg, 1, as.list), "category", "count"))

p_milpol <- hw_raw %>%
  group_by(state) %>%
  summarise(Military = sum(involved_in_military == "yes", na.rm = TRUE),
            Political = sum(involved_in_politics == "yes", na.rm = TRUE), .groups = "drop") %>%
  filter(Military + Political > 0) %>%
  arrange(desc(Military + Political)) %>%
  mutate(stateCode = state_name_to_code[state])
add_component(chart_component(
  "p_milpol", "Military & political honorees by state", "stackedBar",
  apply(p_milpol, 1, as.list), "state", "Military", series = c("Military", "Political")
))

p_gender_state <- hw_raw %>%
  filter(gender %in% c("male", "female")) %>%
  group_by(state) %>%
  summarise(male = sum(gender == "male"), female = sum(gender == "female"), known = n(), .groups = "drop") %>%
  filter(known >= 3) %>%
  mutate(pct_female = female / known, stateCode = state_name_to_code[state])
add_component(chart_component("p_gender_state", "% Female honorees by state", "bar", apply(p_gender_state, 1, as.list), "state", "pct_female"))

# Eras
p_birth <- eras %>%
  filter(birth_dec >= 1700, birth_dec <= 1990, !is.na(birth_dec)) %>%
  count(birth_dec, name = "count")
add_component(chart_component("p_birth", "Honoree birth decades", "bar", apply(p_birth, 1, as.list), "birth_dec", "count"))

p_death <- eras %>%
  filter(death_dec >= 1800, death_dec <= 2020, !is.na(death_dec)) %>%
  count(death_dec, name = "count")
add_component(chart_component("p_death", "Honoree death decades", "bar", apply(p_death, 1, as.list), "death_dec", "count"))

# Honoree geography static metrics + charts
geo_known_birth <- geo %>% filter(!is.na(birth_state))
geo_known_death <- geo %>% filter(!is.na(death_state))
geo_match <- geo %>% filter(!is.na(birth_state), !is.na(state))
add_component(metric_component("geo_known_birth", "with known birth state", nrow(geo_known_birth)))
add_component(metric_component("geo_birth_same", "born in highway state", paste0(round(mean(geo_match$birth_state == geo_match$state) * 100, 1), "%")))
add_component(metric_component("geo_foreign_birth", "foreign-born honorees", sum(is.na(geo$birth_state) & !is.na(geo$place_of_birth))))
add_component(metric_component("geo_known_death", "with known death state", nrow(geo_known_death)))

p_birth_state <- geo %>%
  filter(!is.na(birth_state)) %>%
  count(birth_state, name = "count") %>%
  arrange(desc(count)) %>%
  head(15)
add_component(chart_component("p_birth_state", "Top 15 birth states", "bar", apply(p_birth_state, 1, as.list), "birth_state", "count"))

p_death_state <- geo %>%
  filter(!is.na(death_state)) %>%
  count(death_state, name = "count") %>%
  arrange(desc(count)) %>%
  head(15)
add_component(chart_component("p_death_state", "Top 15 death states", "bar", apply(p_death_state, 1, as.list), "death_state", "count"))

p_birth_match <- geo %>%
  filter(!is.na(birth_state), !is.na(state)) %>%
  transmute(category = if_else(birth_state == state, "Born in highway state", "Born elsewhere")) %>%
  count(category, name = "count")
add_component(chart_component("p_birth_match", "Born in honoring state?", "pie", apply(p_birth_match, 1, as.list), "category", "count"))

p_cross_state <- geo %>%
  filter(!is.na(birth_state), !is.na(state), birth_state != state) %>%
  count(birth_state, state, name = "count", sort = TRUE) %>%
  head(10) %>%
  mutate(pair = paste(birth_state, "->", state))
add_component(chart_component("p_cross_state", "Top cross-state connections", "bar", apply(p_cross_state, 1, as.list), "pair", "count"))

# Education
inst_data <- tibble(
  institution = c("Morehouse College", "Crozer Theological Seminary", "Boston University",
                  "University of Georgia", "Yale University", "US Military Academy",
                  "University of Florida", "University of Kansas", "Univ. Southern California",
                  "Harvard University", "University of Utah", "Univ. Wisconsin-Madison",
                  "University of Minnesota", "University of Chicago",
                  "Alabama State Teachers College", "Highlander Folk School",
                  "Kansas State University", "Miami University", "Florida A&M University",
                  "Ecole Militaire (Paris)"),
  count = c(16, 15, 15, 11, 8, 8, 8, 5, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3),
  type = c("college", "theological", "college", "college", "college", "military",
           "college", "college", "college", "college", "college", "college", "college",
           "college", "college", "college", "college", "college", "college", "military")
)
add_component(chart_component("p_inst", "Top 20 institutions attended by honorees", "bar", apply(inst_data, 1, as.list), "institution", "count"))

p_inst_type <- tibble(
  type = c("University/College", "Theological", "Military", "Other"),
  count = c(180, 21, 12, 5)
)
add_component(chart_component("p_inst_type", "Institution type breakdown", "pie", apply(p_inst_type, 1, as.list), "type", "count"))

# Lifespan
lifespan_valid <- eras %>% filter(!is.na(lifespan), lifespan > 0, lifespan < 120)
add_component(metric_component("lifespan_mean", "Mean lifespan (n=214)", "70.3 yrs"))
add_component(metric_component("lifespan_female", "Female avg lifespan", "81.1 yrs"))
add_component(metric_component("lifespan_male", "Male avg lifespan", "68.7 yrs"))
add_component(metric_component("lifespan_youngest", "Youngest honoree", "23 yrs"))

p_lifespan_hist <- lifespan_valid %>%
  mutate(bin = cut(lifespan, breaks = seq(20, 100, 10),
                   labels = paste0(seq(20, 90, 10), "-", seq(29, 99, 10)),
                   right = FALSE)) %>%
  filter(!is.na(bin)) %>%
  count(bin, name = "count") %>%
  mutate(bin = as.character(bin))
add_component(chart_component("p_lifespan_hist", "Lifespan distribution", "bar", apply(p_lifespan_hist, 1, as.list), "bin", "count"))

p_lifespan_gender <- lifespan_valid %>%
  filter(gender %in% c("male", "female")) %>%
  group_by(gender) %>%
  summarise(mean = mean(lifespan), count = n(), .groups = "drop")
add_component(chart_component("p_lifespan_gender", "Mean lifespan by gender", "bar", apply(p_lifespan_gender, 1, as.list), "gender", "mean"))

p_lifespan_era <- lifespan_valid %>%
  mutate(era = cut(dob_year, breaks = c(1600, 1800, 1850, 1880, 1900, 1920, 1940, 1960, 2000),
                   labels = c("Pre-1800", "1800-49", "1850-79", "1880-99", "1900-19", "1920-39", "1940-59", "1960+"))) %>%
  filter(!is.na(era)) %>%
  group_by(era) %>%
  summarise(mean = mean(lifespan), count = n(), .groups = "drop")
add_component(chart_component("p_lifespan_era", "Mean lifespan by birth era", "bar", apply(p_lifespan_era, 1, as.list), "era", "mean"))

# Profiles
p_wiki_rate <- state_profiles %>%
  transmute(state, stateCode, wiki_pct)
add_component(chart_component("p_wiki_rate", "Wikipedia match rate by state", "bar", apply(p_wiki_rate, 1, as.list), "state", "wiki_pct"))

tbl_profiles <- state_profiles %>%
  arrange(desc(highways)) %>%
  mutate(
    `Match %` = paste0(round(wiki_pct * 100, 1), "%"),
    State = state
  ) %>%
  select(State, Highways = highways, `Wiki matched` = has_wiki, `Match %`, Male = male, Female = female,
         Military = military, Political = politics, Sports = sports, Music = music)
add_component(table_component("tbl_profiles", "Full state profile table", tbl_profiles))

# Names
add_component(metric_component("name_veterans", "'Veterans' appearances", 425))
add_component(metric_component("name_blue_star", "Blue Star Mem. instances", 72))
add_component(metric_component("name_common_first", "Most common first name", "John"))
add_component(metric_component("name_sergeant", "Highways use 'Sergeant'", 100))

p_words <- word_freq %>%
  slice_max(n, n = 25) %>%
  mutate(theme = case_when(
    words %in% c("veterans", "army", "war", "sergeant", "division", "corporal",
                 "sgt", "pfc", "infantry", "colonel", "general", "captain",
                 "medal", "honor", "korean", "navy") ~ "Military",
    words %in% c("officer", "trooper", "deputy", "police", "sheriff") ~ "Law enforcement",
    words %in% c("john", "james", "robert", "william", "david", "charles",
                 "george", "thomas", "martin") ~ "Given name",
    TRUE ~ "Other"
  )) %>%
  transmute(word = words, count = n, theme)
add_component(chart_component("p_words", "Top 25 words in highway names", "bar", apply(p_words, 1, as.list), "word", "count"))

p_prefix <- tibble(
  title = c("Sergeant", "Senator", "Dr.", "General", "Captain", "Governor", "President", "Colonel", "Judge", "Rev."),
  count = c(100, 65, 53, 46, 40, 30, 23, 19, 9, 4)
)
add_component(chart_component("p_prefix", "Honorary titles & ranks", "bar", apply(p_prefix, 1, as.list), "title", "count"))

p_top_names <- tibble(
  name = c("Blue Star Memorial Hwy", "Purple Heart Trail", "Veterans Memorial Hwy", "American Legion Memorial Hwy",
           "Turkey Wheat Trail Hwy", "Eisenhower Memorial Hwy", "VFW Highway", "Korean War Veterans Memorial Hwy",
           "Pearl Harbor Memorial Hwy", "WWII Veterans Memorial Hwy"),
  count = c(72, 64, 45, 28, 28, 23, 20, 18, 16, 15)
)
add_component(chart_component("p_top_names", "Most repeated highway names", "bar", apply(p_top_names, 1, as.list), "name", "count"))

# Categories
p_cat_donut <- tibble(
  category = c("Individual/Other", "Military/Veterans", "Law Enforcement", "Political Figures", "MLK Jr.", "Religious Figures"),
  count = c(3679, 874, 550, 167, 37, 28)
)
add_component(chart_component("p_cat_donut", "Highway category breakdown", "pie", apply(p_cat_donut, 1, as.list), "category", "count"))

p_mlk <- hw_raw %>%
  filter(str_detect(highway_name, regex("martin luther king|mlk|king jr", ignore_case = TRUE))) %>%
  count(state, name = "count") %>%
  arrange(desc(count)) %>%
  mutate(stateCode = state_name_to_code[state])
add_component(chart_component("p_mlk", "MLK Jr. highways by state", "bar", apply(p_mlk, 1, as.list), "state", "count"))

# Economics variants
econ_variants <- list()
for (opt in econ_var_options) {
  var <- opt$value
  econ_df <- master %>%
    filter(!is.na(.data[[var]])) %>%
    transmute(state, stateCode, x = .data[[var]], highways, winner24)
  econ_variants[[var]] <- apply(econ_df, 1, as.list)
}
add_component(chart_component("p_econ_scatter", "Demographic vs highway count", "scatter", econ_variants$Median_Household_Income,
                             "x", "highways", series = c("winner24"), filterId = "econ_var", variants = econ_variants))

p_income_q <- master %>%
  filter(!is.na(Median_Household_Income)) %>%
  mutate(q = ntile(Median_Household_Income, 4),
         quartile = c("Q1 Lowest", "Q2", "Q3", "Q4 Highest")[q]) %>%
  group_by(quartile) %>%
  summarise(total = sum(highways), .groups = "drop")
add_component(chart_component("p_income_q", "Income quartile totals", "bar", apply(p_income_q, 1, as.list), "quartile", "total"))

# Race variants
race_variants <- list()
for (opt in race_var_options) {
  var <- opt$value
  race_df <- master %>%
    filter(!is.na(.data[[var]])) %>%
    transmute(state, stateCode, x = .data[[var]], highways, winner24)
  race_variants[[var]] <- apply(race_df, 1, as.list)
}
add_component(chart_component("p_race_scatter", "Race/ethnicity vs highway count", "scatter", race_variants$Pct_AIAN_Alone,
                             "x", "highways", series = c("winner24"), filterId = "race_var", variants = race_variants))

p_race_stack <- master %>%
  filter(!is.na(Pct_White_Alone)) %>%
  select(state, highways, White = Pct_White_Alone, Black = Pct_Black_Alone, Hispanic = Pct_Hispanic,
         Asian = Pct_Asian_Alone, AIAN = Pct_AIAN_Alone, `Two+` = Pct_TwoOrMore)
add_component(chart_component("p_race_stack", "Racial composition stacked", "stackedBar", apply(p_race_stack, 1, as.list),
                             "state", "White", series = c("White", "Black", "Hispanic", "Asian", "AIAN", "Two+")))

# Elections
add_component(metric_component("elec_gop_avg", "Avg highways — GOP states (2024)", 204))
add_component(metric_component("elec_dem_avg", "Avg highways — DEM states (2024)", 81))
add_component(metric_component("elec_corr", "Margin x count correlation", "-0.003"))
add_component(metric_component("elec_swing", "Avg GOP swing 2020->2024", "+4.5pp"))

partisan_variants <- list()
for (yr in c("m16", "m20", "m24")) {
  p <- master %>%
    filter(!is.na(.data[[yr]])) %>%
    mutate(winner = if_else(.data[[yr]] > 0, "GOP", "DEM")) %>%
    transmute(state, stateCode, margin = .data[[yr]], highways, winner)
  partisan_variants[[yr]] <- apply(p, 1, as.list)
}
add_component(chart_component("p_partisan", "GOP margin vs highway count", "scatter", partisan_variants$m24,
                             "margin", "highways", series = c("winner"), filterId = "elec_year", variants = partisan_variants))

p_party_bar <- master %>%
  filter(!is.na(winner24)) %>%
  arrange(winner24, desc(highways)) %>%
  transmute(state, stateCode, highways, winner24)
add_component(chart_component("p_party_bar", "Highways by partisan grouping (2024)", "bar", apply(p_party_bar, 1, as.list), "state", "highways", series = c("winner24")))

# ODMP
add_component(metric_component("vb_odmp_total", "ODMP-matched highways", nrow(odmp)))
add_component(metric_component("vb_odmp_states", "States with ODMP data", n_distinct(odmp$state)))
add_component(metric_component("vb_odmp_age", "Mean officer age at death", paste0(round(mean(odmp$age_num, na.rm = TRUE), 1), " yrs")))
add_component(metric_component("vb_odmp_tour", "Mean tour of duty", paste0(round(mean(odmp$tour_years, na.rm = TRUE), 1), " yrs")))

p_odmp_cause <- odmp %>% count(cause_grp, name = "count")
add_component(chart_component("p_odmp_cause", "Cause of death", "bar", apply(p_odmp_cause, 1, as.list), "cause_grp", "count"))

p_odmp_cause_state <- odmp %>% count(state, cause_grp, name = "count")
add_component(chart_component("p_odmp_cause_state", "Cause of death by state", "stackedBar", apply(p_odmp_cause_state, 1, as.list),
                             "state", "count", series = c("cause_grp")))

p_odmp_eow_decade <- odmp %>% filter(!is.na(eow_decade)) %>% count(eow_decade, name = "count")
add_component(chart_component("p_odmp_eow_decade", "End of watch by decade", "bar", apply(p_odmp_eow_decade, 1, as.list), "eow_decade", "count"))

p_odmp_eow_month <- odmp %>% filter(!is.na(eow_month)) %>% count(eow_month, name = "count")
add_component(chart_component("p_odmp_eow_month", "End of watch month", "bar", apply(p_odmp_eow_month, 1, as.list), "eow_month", "count"))

p_odmp_age_hist <- odmp %>% filter(!is.na(age_num)) %>% transmute(bin = floor(age_num / 5) * 5) %>% count(bin, name = "count")
add_component(chart_component("p_odmp_age_hist", "Officer age at time of death", "bar", apply(p_odmp_age_hist, 1, as.list), "bin", "count"))

p_odmp_tour_hist <- odmp %>% filter(!is.na(tour_years)) %>% transmute(bin = floor(tour_years / 3) * 3) %>% count(bin, name = "count")
add_component(chart_component("p_odmp_tour_hist", "Years of service", "bar", apply(p_odmp_tour_hist, 1, as.list), "bin", "count"))

p_odmp_age_tour <- odmp %>% filter(!is.na(age_num), !is.na(tour_years)) %>% transmute(tour_years, age_num, cause_grp)
add_component(chart_component("p_odmp_age_tour", "Age vs years of service", "scatter", apply(p_odmp_age_tour, 1, as.list), "tour_years", "age_num", c("cause_grp")))

p_odmp_age_by_cause <- odmp %>%
  filter(!is.na(age_num)) %>%
  group_by(cause_grp) %>%
  summarise(mean_age = mean(age_num), count = n(), .groups = "drop")
add_component(chart_component("p_odmp_age_by_cause", "Mean officer age by cause of death", "bar", apply(p_odmp_age_by_cause, 1, as.list), "cause_grp", "mean_age"))

p_odmp_tour_by_cause <- odmp %>%
  filter(!is.na(tour_years)) %>%
  group_by(cause_grp) %>%
  summarise(mean_tour = mean(tour_years), count = n(), .groups = "drop")
add_component(chart_component("p_odmp_tour_by_cause", "Mean years of service by cause", "bar", apply(p_odmp_tour_by_cause, 1, as.list), "cause_grp", "mean_tour"))

p_odmp_age_over_time <- odmp %>%
  filter(!is.na(age_num), !is.na(eow_decade)) %>%
  group_by(eow_decade) %>%
  summarise(mean_age = mean(age_num), count = n(), .groups = "drop")
add_component(chart_component("p_odmp_age_over_time", "Mean officer age at death by decade", "line", apply(p_odmp_age_over_time, 1, as.list), "eow_decade", "mean_age"))

p_odmp_fuzzy <- odmp %>% filter(!is.na(odmp_fuzzy_score)) %>% count(match_quality, name = "count") %>% mutate(match_quality = as.character(match_quality))
add_component(chart_component("p_odmp_fuzzy", "Match quality fuzzy score distribution", "bar", apply(p_odmp_fuzzy, 1, as.list), "match_quality", "count"))

p_odmp_state_profile <- odmp_state_rate %>%
  filter(!is.na(avg_age)) %>%
  transmute(state, odmp_n, avg_age, avg_tour, pct_gunfire)
add_component(chart_component("p_odmp_state_profile", "State ODMP profile", "multiMetric", apply(p_odmp_state_profile, 1, as.list),
                             "state", "avg_age", c("avg_tour", "pct_gunfire")))

p_odmp_incident_words <- incident_words %>% slice_max(n, n = 20) %>% transmute(word = words, count = n)
add_component(chart_component("p_odmp_incident_words", "Top words in incident details", "bar", apply(p_odmp_incident_words, 1, as.list), "word", "count"))

p_odmp_weapon <- odmp %>% count(weapon, cause_grp, name = "count")
add_component(chart_component("p_odmp_weapon", "Weapon type from incident details", "stackedBar", apply(p_odmp_weapon, 1, as.list), "weapon", "count", c("cause_grp")))

odmp_year_variants <- list()
odmp_age_variants <- list()
for (opt in odmp_cause_options) {
  v <- opt$value
  filtered <- if (v == "all") odmp else odmp %>% filter(cause_grp == v)
  odmp_year_variants[[v]] <- apply(filtered %>% filter(!is.na(eow_year)) %>% count(eow_year, cause_grp, name = "count"), 1, as.list)
  odmp_age_variants[[v]] <- apply(filtered %>% filter(!is.na(age_num)) %>% transmute(bin = floor(age_num / 5) * 5) %>% count(bin, name = "count"), 1, as.list)
}
add_component(chart_component("p_odmp_cause_year", "EOW year - filtered by cause", "stackedBar",
                             odmp_year_variants$all, "eow_year", "count", c("cause_grp"), "odmp_cause_filter", odmp_year_variants))
add_component(chart_component("p_odmp_cause_age", "Age distribution - filtered by cause", "bar",
                             odmp_age_variants$all, "bin", "count", filterId = "odmp_cause_filter", variants = odmp_age_variants))

tbl_odmp <- odmp %>%
  transmute(
    State = state,
    Highway = highway_name,
    Officer = odmp_name,
    Age = age_num,
    `Service (yrs)` = tour_years,
    Cause = cause_grp,
    `End of Watch` = odmp_end_of_watch,
    `Fuzzy score` = odmp_fuzzy_score,
    `ODMP URL` = odmp_url
  )
add_component(table_component("tbl_odmp", "Full ODMP record table", tbl_odmp))

tabs <- list(
  list(id = "overview", label = "Summary", components = c("vb_total", "vb_states", "vb_verified", "vb_mlk", "vb_military", "vb_political", "vb_gop_avg", "vb_dem_avg", "p_top15", "p_dist")),
  list(id = "geography", label = "Geography", components = c("p_map")),
  list(id = "honorees", label = "Honorees", components = c("p_gender", "p_bg", "p_milpol", "p_gender_state")),
  list(id = "eras", label = "Historical Eras", components = c("p_birth", "p_death")),
  list(id = "geo2", label = "Honoree Geography", components = c("geo_known_birth", "geo_birth_same", "geo_foreign_birth", "geo_known_death", "p_birth_state", "p_death_state", "p_birth_match", "p_cross_state")),
  list(id = "education", label = "Education", components = c("p_inst", "p_inst_type")),
  list(id = "lifespan", label = "Lifespan", components = c("lifespan_mean", "lifespan_female", "lifespan_male", "lifespan_youngest", "p_lifespan_hist", "p_lifespan_gender", "p_lifespan_era")),
  list(id = "profiles", label = "State Profiles", components = c("p_wiki_rate", "tbl_profiles")),
  list(id = "names", label = "Highway Names", components = c("name_veterans", "name_blue_star", "name_common_first", "name_sergeant", "p_words", "p_prefix", "p_top_names")),
  list(id = "categories", label = "Highway Categories", components = c("p_cat_donut", "p_mlk")),
  list(id = "economics", label = "Economic Demo.", components = c("p_econ_scatter", "p_income_q")),
  list(id = "race", label = "Race & Ethnicity", components = c("p_race_scatter", "p_race_stack")),
  list(id = "elections", label = "Partisan Lean", components = c("elec_gop_avg", "elec_dem_avg", "elec_corr", "elec_swing", "p_partisan", "p_party_bar")),
  list(id = "odmp", label = "ODMP - Officer Data", components = c("vb_odmp_total", "vb_odmp_states", "vb_odmp_age", "vb_odmp_tour", "p_odmp_cause", "p_odmp_cause_state", "p_odmp_eow_decade", "p_odmp_eow_month", "p_odmp_age_hist", "p_odmp_tour_hist", "p_odmp_age_tour", "p_odmp_age_by_cause", "p_odmp_tour_by_cause", "p_odmp_age_over_time", "p_odmp_fuzzy", "p_odmp_state_profile", "p_odmp_incident_words", "p_odmp_weapon", "p_odmp_cause_year", "p_odmp_cause_age", "tbl_odmp"))
)

filters <- list(
  map_var = list(label = "Overlay variable", default = "highways", options = map_var_options),
  econ_var = list(label = "Demographic variable", default = "Median_Household_Income", options = econ_var_options),
  race_var = list(label = "Racial group", default = "Pct_AIAN_Alone", options = race_var_options),
  elec_year = list(
    label = "Election year",
    default = "m24",
    options = list(list(label = "2016", value = "m16"), list(label = "2020", value = "m20"), list(label = "2024", value = "m24"))
  ),
  odmp_cause_filter = list(label = "Cause of death", default = "all", options = odmp_cause_options)
)

artifact <- list(
  version = "1.0.0",
  generatedAt = as.character(Sys.time()),
  source = list(
    script = "scripts/export-rshiny-findings-artifacts.R",
    csv = basename(must_exist)
  ),
  filters = filters,
  tabs = tabs,
  components = components
)

out_dir <- file.path(app_root, "public", "data", "rshiny")
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

out_file <- file.path(out_dir, "findings-artifacts.json")
write_json(artifact, out_file, pretty = TRUE, auto_unbox = TRUE, null = "null", na = "null")
message("Wrote artifact: ", out_file)
