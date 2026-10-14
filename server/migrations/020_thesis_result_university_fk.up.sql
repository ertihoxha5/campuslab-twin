ALTER TABLE thesis_functional_results
  ADD CONSTRAINT fk_thesis_result_university
    FOREIGN KEY (university_id) REFERENCES universities (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
