package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.OfferLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferLetterRepository extends JpaRepository<OfferLetter, Long> {

       /**
        * Find the latest offer letter by employee ID (for auto-increment logic)
        */
       Optional<OfferLetter> findTopByOrderByEmployeeIdDesc();

       /**
        * Find all offers for a specific candidate
        */
       List<OfferLetter> findByCandidateId(Long candidateId);

       /**
        * Check if an offer already exists for a candidate and job opening
        */
       boolean existsByCandidateIdAndJobOpeningId(Long candidateId, Long jobOpeningId);

       /**
        * Find offer by candidate ID and job opening ID
        */
       Optional<OfferLetter> findByCandidateIdAndJobOpeningId(Long candidateId, Long jobOpeningId);

       /**
        * Find offer by ID with all relationships eagerly loaded using JOIN FETCH.
        * This prevents LazyInitializationException when accessing related entities.
        */
       @Query("SELECT DISTINCT o FROM OfferLetter o " +
                     "LEFT JOIN FETCH o.candidate c " +
                     "LEFT JOIN FETCH o.jobOpening j " +
                     "LEFT JOIN FETCH o.createdBy " +
                     "WHERE o.id = :id")
       Optional<OfferLetter> findByIdWithRelations(@Param("id") Long id);

       /**
        * Find only the latest active offer for each unique candidate-job combination.
        * This prevents duplicate rows for the same candidate and job.
        * Returns the offer with the highest ID (most recent) for each combination.
        */
       @Query("SELECT o FROM OfferLetter o " +
                     "WHERE o.id IN (" +
                     "  SELECT MAX(o2.id) FROM OfferLetter o2 " +
                     "  GROUP BY o2.candidate.id, o2.jobOpening.id" +
                     ")")
       List<OfferLetter> findLatestUniqueOffers();

       @Query("SELECT o FROM OfferLetter o " +
                     "WHERE o.id IN (" +
                     "  SELECT MAX(o2.id) FROM OfferLetter o2 " +
                     "  GROUP BY o2.candidate.id, o2.jobOpening.id" +
                     ")")
       org.springframework.data.domain.Page<OfferLetter> findLatestUniqueOffers(
                     org.springframework.data.domain.Pageable pageable);
}
