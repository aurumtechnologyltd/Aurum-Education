import type { Assignment, Course, Semester } from '@/types/database'

export interface CourseGradeResult {
  percentage: number
  letterGrade: string
  gpaValue: number
  completionPercentage: number
}

export interface CumulativeGPAResult {
  cumulativeGPA: number
  totalCredits: number
  totalQualityPoints: number
}

/**
 * Convert percentage to letter grade based on grading scale
 */
export function percentageToLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 85) return 'A-'
  if (percentage >= 80) return 'B+'
  if (percentage >= 75) return 'B'
  if (percentage >= 70) return 'B-'
  if (percentage >= 65) return 'C+'
  if (percentage >= 60) return 'C'
  if (percentage >= 55) return 'C-'
  if (percentage >= 50) return 'D'
  return 'F'
}

/**
 * Convert percentage to GPA value based on grading scale
 */
export function percentageToGPAValue(percentage: number): number {
  if (percentage >= 90) return 4.0
  if (percentage >= 85) return 3.67
  if (percentage >= 80) return 3.33
  if (percentage >= 75) return 3.0
  if (percentage >= 70) return 2.67
  if (percentage >= 65) return 2.33
  if (percentage >= 60) return 2.0
  if (percentage >= 55) return 1.67
  if (percentage >= 50) return 1.0
  return 0.0
}

/**
 * Calculate course grade from assessments
 * Returns weighted contribution sum, letter grade, GPA, and completion percentage
 */
export function calculateCourseGrade(assignments: Assignment[]): CourseGradeResult {
  // Filter to only graded assessments (those with score_percentage)
  const gradedAssignments = assignments.filter(
    a => a.score_percentage !== null && a.score_percentage !== undefined && a.weight_percentage !== null && a.weight_percentage !== undefined
  )

  if (gradedAssignments.length === 0) {
    return {
      percentage: 0,
      letterGrade: 'N/A',
      gpaValue: 0,
      completionPercentage: 0,
    }
  }

  // Calculate weighted contribution for each graded assessment
  // Formula: (score_percentage × weight_percentage) / 100
  let totalWeightedContribution = 0
  let totalGradedWeight = 0

  gradedAssignments.forEach(assignment => {
    const scorePercentage = assignment.score_percentage!
    const weightPercentage = assignment.weight_percentage!
    
    const weightedContribution = (scorePercentage * weightPercentage) / 100
    totalWeightedContribution += weightedContribution
    totalGradedWeight += weightPercentage
  })

  // Course grade percentage is the sum of all weighted contributions
  const courseGradePercentage = totalWeightedContribution

  // Convert to letter grade and GPA
  const letterGrade = percentageToLetterGrade(courseGradePercentage)
  const gpaValue = percentageToGPAValue(courseGradePercentage)

  return {
    percentage: Math.round(courseGradePercentage * 10) / 10, // Round to 1 decimal
    letterGrade,
    gpaValue: Math.round(gpaValue * 100) / 100, // Round to 2 decimals
    completionPercentage: Math.round(totalGradedWeight * 10) / 10, // Round to 1 decimal
  }
}

/**
 * Calculate semester GPA as weighted average by course credits
 */
export function calculateSemesterGPA(courses: Course[]): number {
  let totalQualityPoints = 0
  let totalCredits = 0

  courses.forEach(course => {
    const credits = course.credits || 0
    const gpaValue = course.course_gpa_value

    // Only include courses with credits > 0 and valid GPA
    if (credits > 0 && gpaValue !== null && gpaValue !== undefined) {
      const qualityPoints = gpaValue * credits
      totalQualityPoints += qualityPoints
      totalCredits += credits
    }
  })

  if (totalCredits === 0) {
    return 0
  }

  const semesterGPA = totalQualityPoints / totalCredits
  return Math.round(semesterGPA * 100) / 100 // Round to 2 decimals
}

/**
 * Calculate cumulative GPA across all semesters
 */
export function calculateCumulativeGPA(semesters: (Semester & { courses: Course[] })[]): CumulativeGPAResult {
  let totalQualityPoints = 0
  let totalCredits = 0

  semesters.forEach(semester => {
    semester.courses.forEach(course => {
      const credits = course.credits || 0
      const gpaValue = course.course_gpa_value

      // Only include courses with credits > 0 and valid GPA
      if (credits > 0 && gpaValue !== null && gpaValue !== undefined) {
        const qualityPoints = gpaValue * credits
        totalQualityPoints += qualityPoints
        totalCredits += credits
      }
    })
  })

  const cumulativeGPA = totalCredits > 0 
    ? Math.round((totalQualityPoints / totalCredits) * 100) / 100 
    : 0

  return {
    cumulativeGPA,
    totalCredits,
    totalQualityPoints,
  }
}

