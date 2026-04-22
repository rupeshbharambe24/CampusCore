"""Shared enum types used across models."""

from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "student"
    FACULTY = "faculty"
    HOD = "hod"
    FEES_DEPARTMENT = "fees_department"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
