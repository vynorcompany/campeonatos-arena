/** Public entry point. Business rules live in the domain modules below. */
export {
  createStudentAction,
  addStudentCreditsAction,
  updateStudentAction,
  deleteStudentAction
} from "@/lib/actions/academy/students";
export {
  createTeacherAction,
  archiveTeacherAction,
  deleteTeacherAction
} from "@/lib/actions/academy/teachers";
export {
  createClassGroupAction,
  updateTeacherClassGroupAction,
  updateTeacherClassGroupCapacityAction,
  moveTeacherClassGroupStudentAction
} from "@/lib/actions/academy/groups";
export {
  createTeacherStudentAction,
  transferTeacherStudentAction,
  createTeacherPlanAction,
  createTeacherPlanWithPriceAction,
  updateTeacherPlanWithPriceAction,
  assignTeacherPlanStudentAction,
  copyTeacherPlansAction,
  removeTeacherPlanStudentAction
} from "@/lib/actions/academy/plans";
export {
  createLessonAction,
  completeLessonAction,
  deleteLessonAction
} from "@/lib/actions/academy/lessons";
