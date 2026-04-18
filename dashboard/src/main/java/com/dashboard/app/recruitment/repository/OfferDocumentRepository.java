package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.OfferDocument;
import com.dashboard.app.recruitment.model.OfferLetter;
import com.dashboard.app.recruitment.model.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferDocumentRepository extends JpaRepository<OfferDocument, Long> {
    List<OfferDocument> findByOfferLetter(OfferLetter offerLetter);

    List<OfferDocument> findByOfferLetterOrderByDocumentTypeAsc(OfferLetter offerLetter);

    Optional<OfferDocument> findByOfferLetterAndDocumentType(OfferLetter offerLetter, DocumentType documentType);

    boolean existsByOfferLetterAndDocumentType(OfferLetter offerLetter, DocumentType documentType);
}
