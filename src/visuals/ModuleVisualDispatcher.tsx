import type { StudyModuleId } from '../core/studyPlanTypes';
import { VisualThemeProvider, type ModuleVisualProps } from './VisualHelpers';
import { M1Visual, M2Visual, M3Visual, M4Visual, M5Visual, M6Visual } from './Phase1Visuals';
import { M7Visual, M8Visual, M9Visual, M10Visual, M11Visual, M12Visual } from './Phase2Visuals';
import { M13Visual, M14Visual, M15Visual, M16Visual, M17Visual } from './Phase3Visuals';
import { M18Visual, M19Visual, M20Visual, M21Visual, M22Visual, M23Visual } from './Phase4Visuals';
import { M24Visual, M25Visual, M26Visual, M27Visual } from './Phase5Visuals';
import { M28Visual, M29Visual, M30Visual, M31Visual, M32Visual } from './Phase6Visuals';

interface DispatcherProps extends ModuleVisualProps {
  moduleId: StudyModuleId;
}

export function ModuleVisualDispatcher({
  moduleId,
  theme,
  onOpen3DLab,
  linked3DLabel,
}: DispatcherProps) {
  const props: ModuleVisualProps = { theme, onOpen3DLab, linked3DLabel };
  let visual: React.ReactNode;
  switch (moduleId) {
    case 'M1': visual = <M1Visual {...props} />; break;
    case 'M2': visual = <M2Visual {...props} />; break;
    case 'M3': visual = <M3Visual {...props} />; break;
    case 'M4': visual = <M4Visual {...props} />; break;
    case 'M5': visual = <M5Visual {...props} />; break;
    case 'M6': visual = <M6Visual {...props} />; break;
    case 'M7': visual = <M7Visual {...props} />; break;
    case 'M8': visual = <M8Visual {...props} />; break;
    case 'M9': visual = <M9Visual {...props} />; break;
    case 'M10': visual = <M10Visual {...props} />; break;
    case 'M11': visual = <M11Visual {...props} />; break;
    case 'M12': visual = <M12Visual {...props} />; break;
    case 'M13': visual = <M13Visual {...props} />; break;
    case 'M14': visual = <M14Visual {...props} />; break;
    case 'M15': visual = <M15Visual {...props} />; break;
    case 'M16': visual = <M16Visual {...props} />; break;
    case 'M17': visual = <M17Visual {...props} />; break;
    case 'M18': visual = <M18Visual {...props} />; break;
    case 'M19': visual = <M19Visual {...props} />; break;
    case 'M20': visual = <M20Visual {...props} />; break;
    case 'M21': visual = <M21Visual {...props} />; break;
    case 'M22': visual = <M22Visual {...props} />; break;
    case 'M23': visual = <M23Visual {...props} />; break;
    case 'M24': visual = <M24Visual {...props} />; break;
    case 'M25': visual = <M25Visual {...props} />; break;
    case 'M26': visual = <M26Visual {...props} />; break;
    case 'M27': visual = <M27Visual {...props} />; break;
    case 'M28': visual = <M28Visual {...props} />; break;
    case 'M29': visual = <M29Visual {...props} />; break;
    case 'M30': visual = <M30Visual {...props} />; break;
    case 'M31': visual = <M31Visual {...props} />; break;
    case 'M32': visual = <M32Visual {...props} />; break;
  }
  return <VisualThemeProvider theme={theme}>{visual}</VisualThemeProvider>;
}
