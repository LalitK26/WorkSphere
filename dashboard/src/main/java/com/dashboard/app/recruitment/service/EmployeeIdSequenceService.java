package com.dashboard.app.recruitment.service;

import com.dashboard.app.recruitment.model.EmployeeIdSequence;
import com.dashboard.app.recruitment.repository.EmployeeIdSequenceRepository;
import com.dashboard.app.recruitment.repository.OfferLetterRepository;
import com.dashboard.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.math.BigInteger;

@Service
public class EmployeeIdSequenceService {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeIdSequenceService.class);

    @Autowired
    private EmployeeIdSequenceRepository sequenceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OfferLetterRepository offerLetterRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Get next employee ID atomically (thread-safe)
     * Initializes sequence if not exists
     */
    @Transactional
    public String getNextEmployeeId() {
        // Check if sequence exists, initialize if not
        if (!sequenceRepository.existsById(1)) {
            initializeSequence();
        }

        // Get sequence with pessimistic write lock (thread-safe)
        EmployeeIdSequence sequence = sequenceRepository.findByIdWithLock()
                .orElseThrow(() -> new IllegalStateException("Employee ID sequence not initialized"));

        // Increment and save
        int nextValue = sequence.getCurrentValue() + 1;
        sequence.setCurrentValue(nextValue);
        sequenceRepository.save(sequence);

        logger.info("Generated employee ID: {}", nextValue);
        return String.valueOf(nextValue);
    }

    /**
     * Initialize sequence from existing employee records
     * Scans both users table and offer_letters table for maximum employee ID
     */
    @Transactional
    public void initializeSequence() {
        logger.info("Initializing employee ID sequence from existing data...");

        int maxFromUsers = getMaxEmployeeIdFromUsers();
        int maxFromOffers = getMaxEmployeeIdFromOffers();
        int initialValue = Math.max(maxFromUsers, maxFromOffers);

        logger.info("Max employee ID from users table: {}", maxFromUsers);
        logger.info("Max employee ID from offer_letters table: {}", maxFromOffers);
        logger.info("Initializing sequence with value: {}", initialValue);

        EmployeeIdSequence sequence = new EmployeeIdSequence();
        sequence.setId(1);
        sequence.setCurrentValue(initialValue);
        sequenceRepository.save(sequence);

        logger.info("Employee ID sequence initialized successfully");
    }

    /**
     * Get maximum employee ID from users table
     * Only considers numeric employee IDs
     */
    private int getMaxEmployeeIdFromUsers() {
        try {
            // Use native query to find max numeric employee_id
            String sql = "SELECT MAX(CAST(employee_id AS UNSIGNED)) FROM users " +
                        "WHERE employee_id REGEXP '^[0-9]+$'";
            
            Query query = entityManager.createNativeQuery(sql);
            Object result = query.getSingleResult();
            
            if (result == null) {
                logger.info("No numeric employee IDs found in users table");
                return 0;
            }
            
            // Handle different return types (BigInteger, Long, Integer)
            if (result instanceof BigInteger) {
                return ((BigInteger) result).intValue();
            } else if (result instanceof Long) {
                return ((Long) result).intValue();
            } else if (result instanceof Integer) {
                return (Integer) result;
            }
            
            return 0;
        } catch (Exception e) {
            logger.warn("Error querying max employee ID from users table: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Get maximum employee ID from offer_letters table
     * Only considers numeric employee IDs
     */
    private int getMaxEmployeeIdFromOffers() {
        try {
            // Use native query to find max numeric employee_id
            String sql = "SELECT MAX(CAST(employee_id AS UNSIGNED)) FROM offer_letters " +
                        "WHERE employee_id REGEXP '^[0-9]+$'";
            
            Query query = entityManager.createNativeQuery(sql);
            Object result = query.getSingleResult();
            
            if (result == null) {
                logger.info("No numeric employee IDs found in offer_letters table");
                return 0;
            }
            
            // Handle different return types (BigInteger, Long, Integer)
            if (result instanceof BigInteger) {
                return ((BigInteger) result).intValue();
            } else if (result instanceof Long) {
                return ((Long) result).intValue();
            } else if (result instanceof Integer) {
                return (Integer) result;
            }
            
            return 0;
        } catch (Exception e) {
            logger.warn("Error querying max employee ID from offer_letters table: {}", e.getMessage());
            return 0;
        }
    }
}
