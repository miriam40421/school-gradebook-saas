import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ClassGroupsModule } from './class-groups/class-groups.module';
import { ClassesModule } from './classes/classes.module';
import { GradingSetTypesModule } from './grading-set-types/grading-set-types.module';
import { GradingSetsModule } from './grading-sets/grading-sets.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolModule } from './school/school.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeacherAssignmentsModule } from './teacher-assignments/teacher-assignments.module';
import { UsersModule } from './users/users.module';
import { GradingTermsModule } from './grading-terms/grading-terms.module';
import { GradebookModule } from './gradebook/gradebook.module';
import { LocksModule } from './locks/locks.module';
import { StorageModule } from './storage/storage.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CertificateTemplatesModule } from './certificate-templates/certificate-templates.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', limit: 300, ttl: 60000 }] }),
    PrismaModule,
    CommonModule,
    StorageModule,
    HealthModule,
    AuthModule,
    SchoolModule,
    GradingSetTypesModule,
    GradingSetsModule,
    SubjectsModule,
    ClassesModule,
    ClassGroupsModule,
    StudentsModule,
    UsersModule,
    TeacherAssignmentsModule,
    GradingTermsModule,
    GradebookModule,
    LocksModule,
    CertificatesModule,
    CertificateTemplatesModule,
    SuperAdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
