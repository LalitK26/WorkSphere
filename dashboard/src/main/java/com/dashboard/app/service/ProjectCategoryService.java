package com.dashboard.app.service;

import com.dashboard.app.dto.request.CategoryRequest;
import com.dashboard.app.dto.response.CategoryResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.ProjectCategory;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.ProjectCategoryRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectCategoryService {

    @Autowired
    private ProjectCategoryRepository projectCategoryRepository;

    @Autowired
    private UserRepository userRepository;

    public List<CategoryResponse> getAll() {
        return projectCategoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CategoryResponse create(CategoryRequest request, Long userId) {
        String name = request.getName().trim();
        if (name.isEmpty()) {
            throw new BadRequestException("Category name cannot be empty");
        }

        projectCategoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            throw new BadRequestException("Category already exists");
        });

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ProjectCategory category = new ProjectCategory();
        category.setName(name);
        category.setCreatedBy(creator);

        ProjectCategory saved = projectCategoryRepository.save(category);
        return mapToResponse(saved);
    }

    public void delete(Long id) {
        ProjectCategory category = projectCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        projectCategoryRepository.delete(category);
    }

    private CategoryResponse mapToResponse(ProjectCategory category) {
        CategoryResponse response = new CategoryResponse();
        response.setId(category.getId());
        response.setName(category.getName());
        response.setCreatedAt(category.getCreatedAt());
        return response;
    }
}


