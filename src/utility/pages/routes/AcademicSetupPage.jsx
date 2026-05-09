import AcademicSetup from '../academicfolder/AcademicSetup';

/**
 * Per-route page component for /AcademicSetup. Wraps the shared AcademicSetup
 * dispatcher so this URL gets its own dedicated entry point — future
 * customisation specific to Academic Setup can be added here without
 * touching siblings.
 */
export default function AcademicSetupPage() {
  return <AcademicSetup />;
}
