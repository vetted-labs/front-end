// components/EditForm.tsx
"use client";
import { useState } from "react";
import {
  Save,
  Loader2,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface JobData {
  id: string;
  title: string;
  department?: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel?: "junior" | "mid" | "senior" | "lead" | "executive";
  salary: { min?: number; max?: number; currency: string };
  status: "draft" | "active" | "paused" | "closed";
  guild: string;
  screeningQuestions: string[];
  createdAt: string;
  companyId: string;
}

interface EditFormProps {
  job: JobData;
  onClose: () => void;
  onSave: (updatedJob: JobData) => void;
}

export default function EditForm({ job, onClose, onSave }: EditFormProps) {
  const [formData, setFormData] = useState<JobData>({
    ...job,
    requirements: job.requirements.length > 0 ? job.requirements : [""],
    skills: job.skills.length > 0 ? job.skills : [""],
    screeningQuestions:
      job.screeningQuestions.length > 0 ? job.screeningQuestions : [""],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const guilds = [
    "Engineering Guild",
    "Product Guild",
    "Design Guild",
    "Marketing Guild",
    "Operations Guild",
    "Sales Guild",
  ];

  const experienceLevels = [
    { value: "junior", label: "Junior (0-2 years)" },
    { value: "mid", label: "Mid-level (2-5 years)" },
    { value: "senior", label: "Senior (5-8 years)" },
    { value: "lead", label: "Lead (8+ years)" },
    { value: "executive", label: "Executive" },
  ];

  // Handle dynamic array fields
  const handleArrayFieldChange = (
    field: "requirements" | "skills" | "screeningQuestions",
    index: number,
    value: string,
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const addArrayField = (
    field: "requirements" | "skills" | "screeningQuestions",
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayField = (
    field: "requirements" | "skills" | "screeningQuestions",
    index: number,
  ) => {
    if (formData[field].length > 1) {
      const newArray = formData[field].filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, [field]: newArray }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title) newErrors.title = "Job title is required";
    if (!formData.description)
      newErrors.description = "Description is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.guild) newErrors.guild = "Please select a guild";

    if (
      formData.salary.min &&
      formData.salary.max &&
      formData.salary.min > formData.salary.max
    ) {
      newErrors.salary = "Maximum salary must be greater than minimum";
    }

    const hasRequirements = formData.requirements.some(
      (req) => req.trim() !== "",
    );
    if (!hasRequirements)
      newErrors.requirements = "At least one requirement is needed";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Filter out empty strings from arrays
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter((r) => r.trim()),
        skills: formData.skills.filter((s) => s.trim()),
        screeningQuestions: formData.screeningQuestions.filter((q) =>
          q.trim(),
        ),
      };

      const response = await fetch(`http://localhost:4000/api/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(cleanedData),
      });

      if (response.ok) {
        onSave(cleanedData);
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || "Failed to update job" });
      }
    } catch (error) {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof JobData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div>
      <div className="p-8 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Edit Job Posting</h1>
        <p className="text-gray-600 mt-2">
          Update the details for this job posting
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="e.g., Senior Frontend Developer"
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department || ""}
                onChange={(e) => handleInputChange("department", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="e.g., Engineering"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Location & Type */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Type
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="e.g., San Francisco, CA"
              />
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type
              </label>
              <select
                value={formData.locationType}
                onChange={(e) => handleInputChange("locationType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange("jobType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compensation & Experience */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Compensation & Experience
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Min (USD)
              </label>
              <input
                type="number"
                value={formData.salary.min || ""}
                onChange={(e) =>
                  handleInputChange("salary", {
                    ...formData.salary,
                    min: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="80000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Max (USD)
              </label>
              <input
                type="number"
                value={formData.salary.max || ""}
                onChange={(e) =>
                  handleInputChange("salary", {
                    ...formData.salary,
                    max: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="120000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel || "mid"}
                onChange={(e) =>
                  handleInputChange("experienceLevel", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                {experienceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errors.salary && (
            <p className="text-red-500 text-xs">{errors.salary}</p>
          )}
        </div>

        {/* Guild Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Guild Assignment *
          </h2>

          <select
            value={formData.guild}
            onChange={(e) => handleInputChange("guild", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="">Select a guild for review</option>
            {guilds.map((guild) => (
              <option key={guild} value={guild}>
                {guild}
              </option>
            ))}
          </select>
          {errors.guild && (
            <p className="text-red-500 text-xs mt-1">{errors.guild}</p>
          )}
        </div>

        {/* Requirements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Requirements *
          </h2>

          {formData.requirements.map((req, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={req}
                onChange={(e) =>
                  handleArrayFieldChange("requirements", index, e.target.value)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="e.g., 5+ years of experience with React"
              />
              <button
                type="button"
                onClick={() => removeArrayField("requirements", index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={formData.requirements.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayField("requirements")}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700"
          >
            <Plus className="w-4 h-4" />
            Add Requirement
          </button>
          {errors.requirements && (
            <p className="text-red-500 text-xs">{errors.requirements}</p>
          )}
        </div>

        {/* Skills */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Skills</h2>

          {formData.skills.map((skill, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={skill}
                onChange={(e) =>
                  handleArrayFieldChange("skills", index, e.target.value)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="e.g., TypeScript"
              />
              <button
                type="button"
                onClick={() => removeArrayField("skills", index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={formData.skills.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayField("skills")}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>

        {/* Screening Questions */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Screening Questions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Add custom questions that candidates must answer when applying
            </p>
          </div>

          {formData.screeningQuestions.map((question, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Question {index + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={question}
                  onChange={(e) =>
                    handleArrayFieldChange(
                      "screeningQuestions",
                      index,
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Enter your screening question..."
                />
              </div>
              <button
                type="button"
                onClick={() => removeArrayField("screeningQuestions", index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                disabled={formData.screeningQuestions.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayField("screeningQuestions")}
            className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Another Question
          </button>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Good screening questions help filter
              candidates early. Ask about specific experience, availability,
              salary expectations, or why they are interested in the role.
            </p>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={(e) => {
              handleInputChange("status", "draft");
              handleSubmit(e as any);
            }}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Save as Draft
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}
      </form>
    </div>
  );
}
